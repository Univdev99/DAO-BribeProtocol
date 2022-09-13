//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Multicall.sol";
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../interfaces/IDividends.sol";
import "../interfaces/IFeeDistribution.sol";

////////////////////////////////////////////////////////////////////////////////////////////
///
/// @title Dividends
/// @author contact@bribe.xyz
/// @notice
///
////////////////////////////////////////////////////////////////////////////////////////////

contract Dividends is IDividends, Ownable, Pausable, Multicall {
    using SafeERC20 for IERC20;
    using SafeCast for uint256;

    uint256 private constant SHARE_SCALE = 1e12;

    /// @dev reward asset
    IERC20 public immutable rewardAsset;

    /// @dev stake asset
    IERC20 public immutable stakeAsset;

    /// @dev feeDistribution
    address public feeDistribution;

    /// @dev totalDividendsReceived
    uint128 public totalDividendsReceived;

    /// @dev totalStaked
    uint128 public totalStaked;

    /// @dev price peer share
    uint128 public pricePerShare;

    struct UserInfo {
        uint128 pendingReward;
        uint128 lastPricePerShare;
        uint256 balance;
    }

    /// @dev userRewards
    mapping(address => UserInfo) public userRewards;

    constructor(
        address rewardAsset_,
        address stakeAsset_,
        address feeDistribution_
    ) {
        require(rewardAsset_ != address(0), "INVALID_ASSET");
        require(stakeAsset_ != address(0), "INVALID_STAKE_ASSET");
        require(feeDistribution_ != address(0), "INVALID_FEE_ASSET");

        rewardAsset = IERC20(rewardAsset_);
        stakeAsset = IERC20(stakeAsset_);
        feeDistribution = feeDistribution_;
    }

    /// @dev accrueDividend
    /// @notice calls the fee distribution contract to claim pending dividend
    function accrueDividend() public whenNotPaused {
        uint256 prevBalance = rewardAsset.balanceOf(address(this));

        uint256 amount = IFeeDistribution(feeDistribution).distributeFeeTo(address(this));

        // assert that the amount was transferred
        require(
            rewardAsset.balanceOf(address(this)) - prevBalance >= amount,
            "INVALID_DISTRIBUTION"
        );

        totalDividendsReceived += amount.toUint128();
        uint256 totalStaked_ = totalStaked > 0 ? totalStaked : 1;
        pricePerShare += ((amount * SHARE_SCALE) / totalStaked_).toUint128();

        emit DistributeDividend(amount);
    }

    /// @dev deposit
    /// @param to address to send
    /// @param amount Amount user wants do stake
    /// @param update to distribute pending dividends or not
    function stake(
        address to,
        uint128 amount,
        bool update
    ) external override whenNotPaused {
        require(to != address(0), "INVALID_TO");
        require(amount > 0, "INVALID_AMOUNT");

        if (update) accrueDividend();

        _accrue(to);

        stakeAsset.safeTransferFrom(msg.sender, address(this), amount);

        userRewards[to].balance += amount;
        totalStaked += amount;

        emit Stake(address(this), msg.sender, to, amount);
    }

    /// @dev _accrue
    /// @param user user address to accrue
    function _accrue(address user) internal {
        userRewards[user].pendingReward += _calculateUserDividend(user).toUint128();
        userRewards[user].lastPricePerShare = pricePerShare;
    }

    /// @dev _calculateUserDividend
    /// @param user User to calculate their dividend
    function _calculateUserDividend(address user) internal view returns (uint256 pendingReward) {
        uint256 lastPricePerShare = userRewards[user].lastPricePerShare;
        uint128 amount = userRewards[user].balance.toUint128();

        if (totalDividendsReceived > 0 && amount > 0) {
            uint128 rewardDebt = ((amount * lastPricePerShare) / SHARE_SCALE).toUint128();
            pendingReward = ((amount * pricePerShare) / SHARE_SCALE) - rewardDebt;
        }
    }

    /// @dev unstake
    /// @param amount amount of tokens to unstake
    /// @param update Either to claim pending dividend from fee distribution contract
    function unstake(uint128 amount, bool update) external {
        if (update) accrueDividend();

        _accrue(msg.sender);

        userRewards[msg.sender].balance -= amount;
        totalStaked -= amount;

        stakeAsset.safeTransfer(msg.sender, amount);

        emit Unstake(msg.sender, amount);
    }

    /// @dev claimUserDividend
    /// @param update update
    function claimUserDividend(bool update) public whenNotPaused {
        if (update) accrueDividend();

        _accrue(msg.sender);

        uint256 pendingReward = userRewards[msg.sender].pendingReward;
        if (pendingReward > 0) {
            userRewards[msg.sender].pendingReward = 0;
            rewardAsset.safeTransfer(msg.sender, pendingReward);
        }

        emit ClaimDividend(msg.sender, pendingReward);
    }

    /// @dev rescueFunds
    function rescueFunds() external onlyOwner {
        uint256 balance = rewardAsset.balanceOf(address(this));

        rewardAsset.transfer(msg.sender, balance);

        emit RescueFunds(balance);
    }

    /// @notice pause actions
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice unpause actions
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @notice setFeeDistributor
    function setFeeDistributor(address newFeeDistribution) external onlyOwner {
        require(newFeeDistribution != address(0), "INVALID_DISTRIBUTOR");

        feeDistribution = newFeeDistribution;

        emit UpdateFeeDistributor(newFeeDistribution);
    }

    /// @dev dividendOf
    /// @param user address of user
    function dividendOf(address user) external view returns (uint256 dividend) {
        dividend = userRewards[user].pendingReward + _calculateUserDividend(user);
    }
}
