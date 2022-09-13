//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/Bribe/IBribeSingleAssetPool.sol";

abstract contract BribeSingleAssetPool is IBribeSingleAssetPool, ERC20, Ownable {
    using SafeERC20 for IERC20;

    struct Bid {
        uint128 highestBid;
        uint64 endTime;
        bool support;
        bool voted;
        address highestBidder;
    }

    /// @dev maximum withdraw delay in seconds; 1 week in seconds
    uint64 internal constant MAX_WITHDRAW_DELAY_SECONDS = 604800;

    /// @dev stakers will deposit governanceToken
    IERC20 public immutable governanceToken;

    /// @dev bidders will bid with bidAsset
    IERC20 public immutable bidAsset;

    /// @dev last vote timestamp
    uint64 public lastVoteEndTime;

    /// @dev delay period for withdrawal after vote ends
    uint64 public withdrawalDelayPeriodInSeconds;

    /// @dev pending rewards to be distributed
    uint128 public pendingRewardToBeDistributed;

    /// @dev total bid amount available to claim
    uint256 public bidIndex;

    /// @dev bidIndex when user claimed lastly
    mapping(address => uint256) private userToBidIndex;

    /// @dev proposal id to bid
    mapping(uint256 => Bid) public bids;

    /// @dev blocked proposals
    mapping(uint256 => bool) public blockedProposals;

    constructor(
        string memory _name,
        string memory _symbol,
        IERC20 _governanceToken,
        IERC20 _bidAsset,
        uint64 _withdrawalDelayPeriodInSeconds
    ) Ownable() ERC20(_name, _symbol) {
        require(address(_governanceToken) != address(0), "INVALID_GOV_TOKEN");
        require(address(_bidAsset) != address(0), "INVALID_BID_ASSET");
        require(_withdrawalDelayPeriodInSeconds > 0, "INVALID_DELAY_PERIOD");

        governanceToken = _governanceToken;
        bidAsset = _bidAsset;
        withdrawalDelayPeriodInSeconds = _withdrawalDelayPeriodInSeconds;
    }

    /// @dev get auction expiration needs an implementation in child contract
    function getAuctionExpiration(uint256 proposalId) internal view virtual returns (uint256) {}

    ///  @dev deposit governance token
    /// @param amount amount to deposit
    /// @notice emit {Deposited} event
    function deposit(uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");

        governanceToken.safeTransferFrom(msg.sender, address(this), amount);

        // claim pending rewards
        claimReward();

        _mint(msg.sender, amount);

        emit Deposit(msg.sender, amount, block.timestamp);
    }

    /// @dev withdraw governance token
    /// @param amount amount to withdraw
    /// @notice emit {Withdrawn} event
    function withdraw(uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        require(balanceOf(msg.sender) >= amount, "INVALID_BALANCE");
        require(
            block.timestamp >= lastVoteEndTime + withdrawalDelayPeriodInSeconds,
            "ACTIVE_DELAY_PERIOD"
        );
        require(pendingRewardToBeDistributed == 0, "ACTIVE_BID");

        _burn(msg.sender, amount);

        claimReward();

        governanceToken.safeTransfer(msg.sender, amount);

        emit Withdraw(msg.sender, amount, block.timestamp);
    }

    /// @dev claim reward
    function claimReward() public override {
        uint256 pendingReward = _userPendingRewards(msg.sender);
        if (pendingReward == 0) return;

        userToBidIndex[msg.sender] = bidIndex;
        bidAsset.safeTransfer(msg.sender, pendingReward);

        emit RewardClaimed(msg.sender, pendingReward);
    }

    /// @dev get reward amount for user specified by `user`
    /// @param user address of user to check balance of
    function rewardBalanceOf(address user) external view override returns (uint256) {
        return _userPendingRewards(user);
    }

    /// @notice call parent's afterVote to perform necessary actions
    function afterVote() internal virtual {
        lastVoteEndTime = uint64(block.timestamp);
    }

    /// @dev place a bid to proposal specified by `proposalId` with `amount` of bid assets
    /// @param proposalId proposal id
    /// @param amount amount of bid assets
    function bid(
        uint256 proposalId,
        uint128 amount,
        bool support
    ) public virtual {
        require(blockedProposals[proposalId] == false, "PROPOSAL_BLOCKED");

        Bid storage _bid = bids[proposalId];
        address prevHighestBidder = _bid.highestBidder;

        require(amount > _bid.highestBid, "LOW_BID");

        if (prevHighestBidder == address(0)) {
            uint64 endTime = uint64(getAuctionExpiration(proposalId));
            require(endTime > block.timestamp, "EXPIRED_PROPOSAL");
            _bid.endTime = endTime;
        } else {
            require(_bid.endTime > block.timestamp, "BID_ENDED");

            // refund to previous highest bidder
            pendingRewardToBeDistributed -= _bid.highestBid;
            bidAsset.safeTransfer(prevHighestBidder, _bid.highestBid);
        }

        bidAsset.safeTransferFrom(msg.sender, address(this), amount);

        pendingRewardToBeDistributed += amount;
        _bid.highestBid = amount;
        _bid.support = support;
        _bid.highestBidder = msg.sender;

        emit HighestBidIncreased(
            proposalId,
            prevHighestBidder,
            _bid.highestBidder,
            _bid.highestBid
        );
    }

    /// @dev get pending rewards for user and will be reset after claimReward
    /// @param user user
    function _userPendingRewards(address user) internal view returns (uint256) {
        return
            ((bidIndex - userToBidIndex[user]) * balanceOf(user)) /
            governanceToken.balanceOf(address(this));
    }

    /// @dev distribute rewards for the proposal
    /// @notice called in children's vote function (after bidding process ended)
    /// @param proposalId id of proposal to distribute rewards fo
    function distributeRewards(uint256 proposalId) public {
        Bid storage _bid = bids[proposalId];
        require(block.timestamp > _bid.endTime, "BID_ACTIVE");

        if (_bid.voted) return;
        pendingRewardToBeDistributed -= _bid.highestBid;
        bidIndex += _bid.highestBid;
        _bid.voted = true;

        emit RewardDistributed(proposalId, _bid.highestBid);
    }

    /// @dev update delay period by owner
    /// @param _withdrawalDelayPeriodInSeconds new delay period
    function setDelayPeriod(uint64 _withdrawalDelayPeriodInSeconds) external override onlyOwner {
        require(_withdrawalDelayPeriodInSeconds > 0, "INVALID_PERIOD");
        require(_withdrawalDelayPeriodInSeconds != withdrawalDelayPeriodInSeconds, "SAME_PERIOD");
        require(_withdrawalDelayPeriodInSeconds <= MAX_WITHDRAW_DELAY_SECONDS, "EXCEEDS_MAX");

        withdrawalDelayPeriodInSeconds = _withdrawalDelayPeriodInSeconds;
    }

    /// @dev block a proposalId from used in the pool
    /// @param proposalId proposalId
    function blockProposalId(uint256 proposalId) external onlyOwner {
        require(blockedProposals[proposalId] == false, "PROPOSAL_INACTIVE");

        blockedProposals[proposalId] = true;

        // check if the proposalId has any bids
        Bid storage currentBid = bids[proposalId];

        // if there is any current highest bidder
        // and the reward has not been distributed refund the bidder
        uint128 highestBid = currentBid.highestBid;
        if (highestBid > 0 && !currentBid.voted) {
            pendingRewardToBeDistributed -= highestBid;
            bidAsset.safeTransfer(currentBid.highestBidder, highestBid);
            currentBid.highestBidder = address(0);
            currentBid.highestBid = 0;
        }

        emit BlockProposalId(proposalId, block.timestamp);
    }

    /// @dev unblock a proposalId from used in the pool
    /// @param proposalId proposalId
    function unblockProposalId(uint256 proposalId) external onlyOwner {
        require(blockedProposals[proposalId] == true, "PROPOSAL_ACTIVE");

        blockedProposals[proposalId] = false;

        emit UnblockProposalId(proposalId, block.timestamp);
    }
}
