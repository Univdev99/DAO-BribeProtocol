//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import "@openzeppelin/contracts-upgradeable/utils/cryptography/MerkleProofUpgradeable.sol";

import "./interfaces/IBribePool.sol";
import "./interfaces/IStates.sol";

import "../helper/Errors.sol";

////////////////////////////////////////////////////////////////////////////////////////////
///
/// @title Bribe Pool
/// @author contact@bribe.xyz
/// @notice
///
////////////////////////////////////////////////////////////////////////////////////////////
contract BribePool is Initializable, OwnableUpgradeable, IBribePool, States {
    using SafeERC20Upgradeable for IERC20Upgradeable;

    ///@param proposalState Last stored state of the proposal
    ///@param expiry timestamp at which the proposal is expected to expire
    ///@param metadata Proposal metadata
    struct Proposal {
        ProposalState proposalState;
        uint64 expiry;
    }

    ///@param total votes accumulated by the pot
    ///@param totalVotes total votes accumulated by the pot
    ///@param totalDeposits total bribe put in the pot
    ///@param noCancellationPenalty if true no cancellation penalty is charged after proposal expires or gets cancelled
    ///@param potType Last stored pot's type
    struct Pot {
        uint128 totalVotes;
        uint128 totalDeposits;
        bytes32 merkleRoot;
        PotType potType;
    }

    /// @dev address that receives the protocol fee
    address public protocolFeeCollector;

    ///@dev fee charged when successful proposals are passed. Scalled to 10*18 (10**18 means 100%)
    uint256 public protocolFee;

    /// @dev address of the bribe token
    address public bidAsset;

    /// @dev minimum tokens required for creating a new bribe pot
    uint128 public MINIMUM_DEPOSIT_THRESHOLD;

    /// @dev cancellation penalty express scalled to 10**18 when bribe pot is cancelled. (10**18 mean 100%)
    uint256 public cancellationPenalty;

    ///@dev minimum deposit for bribe pot become refundable
    uint256 public minimumDepositForPotRefund;

    /// @dev name of the bribe pool
    string public bribePoolName;

    /// @dev mapping of proposals
    mapping(bytes32 => Proposal) public proposals;

    /// @dev nested mapping of bribe pots created per proposal
    mapping(bytes32 => mapping(uint256 => Pot)) public potDetails;

    /// @dev nested mapping of deposits for every bribe pot
    mapping(bytes32 => mapping(uint256 => mapping(address => uint256))) public potDeposits;

    /// @dev nested map of rewards claimed
    mapping(bytes32 => mapping(uint256 => mapping(address => bool))) public claimedReward;

    /// @dev initialize the bribe pool
    /// @param _admin admin/owner of the bribe pool\
    /// @param _protocolFeeCollector address that receives the protocol fee collected
    /// @param _name name of the bribe pool
    /// @param _bidAsset address of the bid token
    /// @param _thresholdForCreatingBribePot minimum number of tokens required to create a bribe pot
    function initialize(
        address _admin,
        address _protocolFeeCollector,
        string calldata _name,
        address _bidAsset,
        uint256 _thresholdForCreatingBribePot
    ) external override initializer {
        __Ownable_init();
        _transferOwnership(_admin);
        bribePoolName = _name;
        bidAsset = _bidAsset;

        _setProtocolFeeCollector(_protocolFeeCollector);
        require(_thresholdForCreatingBribePot > 0, Errors.ZERO_THRESHOLD);
        MINIMUM_DEPOSIT_THRESHOLD = uint128(_thresholdForCreatingBribePot);
    }

    /// @dev create a new proposal
    /// @param proposalId snapshot ID of the proposal
    /// @param expiry timestamp when the proposal is supposed to expire
    function createProposal(bytes32 proposalId, uint64 expiry)
        external
        onlyOwner
        returns (bytes32)
    {
        require(expiry > block.timestamp, Errors.INVALID_EXPIRY_TIME);

        ProposalState proposalState = getProposalState(proposalId);
        require(proposalState == ProposalState.NOT_CREATED, Errors.PROPOSAL_ALREADY_CREATED);

        Proposal memory proposal = Proposal(ProposalState.ACTIVE, expiry);
        proposals[proposalId] = proposal;
        emit CreatedProposal(proposalId);
        return proposalId;
    }

    /// @dev get the current state of the proposal
    /// @param proposalId ID of the proposal
    function getProposalState(bytes32 proposalId) public view returns (ProposalState) {
        Proposal memory proposal = proposals[proposalId];
        if (
            proposal.proposalState == ProposalState.NOT_CREATED ||
            proposal.proposalState == ProposalState.EXECUTED
        ) {
            return proposal.proposalState;
        } else if (block.timestamp > proposal.expiry + 30 days) {
            return ProposalState.DEAD;
        } else if (
            block.timestamp > proposal.expiry && block.timestamp <= proposal.expiry + 30 days
        ) {
            if (proposal.proposalState == ProposalState.CANCELLED) {
                return ProposalState.CANCELLED;
            } else {
                return ProposalState.EXPIRED;
            }
        } else {
            return proposal.proposalState;
        }
    }

    /// @dev get the current state of the pot
    /// @param proposalId ID of the proposal
    /// @param optionIndex option number/ bribe pot number
    function getPotType(bytes32 proposalId, uint256 optionIndex) public view returns (PotType) {
        ProposalState proposalState = getProposalState(proposalId);

        if (proposalState == ProposalState.NOT_CREATED) {
            return PotType.NOT_CREATED;
        } else if (proposalState == ProposalState.ACTIVE) {
            return PotType.DEPOSIT_READY;
        } else if (proposalState == ProposalState.EXPIRED) {
            return PotType.SUBJECT_TO_PENALTY;
        } else if (proposalState == ProposalState.EXECUTED) {
            Pot memory pot = potDetails[proposalId][optionIndex];
            if (pot.potType == PotType.REWARD_GENERATING || pot.potType == PotType.NOT_CREATED) {
                return pot.potType;
            } else {
                Proposal memory proposal = proposals[proposalId];
                if (block.timestamp > proposal.expiry) {
                    return PotType.DEAD;
                } else {
                    if (pot.potType == PotType.NO_PENALTY) {
                        return PotType.NO_PENALTY;
                    } else {
                        return PotType.SUBJECT_TO_PENALTY;
                    }
                }
            }
        } else if (proposalState == ProposalState.CANCELLED) {
            return PotType.SUBJECT_TO_PENALTY;
        } else {
            return PotType.DEAD;
        }
    }

    /// @dev override the existing function renounceOwnership
    function renounceOwnership() public pure override {
        revert(Errors.CANT_RENOUNCE_OWNERSHIP);
    }

    /// @dev cancel the proposal
    /// @param proposalId ID of the proposal
    function cancelProposal(bytes32 proposalId) external onlyOwner {
        ProposalState proposalState = getProposalState(proposalId);
        require(proposalState == ProposalState.ACTIVE, Errors.PROPOSAL_NOT_ACTIVE);

        proposals[proposalId].proposalState = ProposalState.CANCELLED;
        emit CancelledProposal(proposalId);
    }

    /// @dev Create a new pot
    /// @param proposalId ID of the proposal
    /// @param optionIndex option number. (needs to be unique for every proposal)
    /// @param amount initial amount deposited in the bribe pot when created
    function createBribePot(
        bytes32 proposalId,
        uint256 optionIndex,
        uint256 amount
    ) external ifBribePotNotExists(proposalId, optionIndex) {
        require(amount >= MINIMUM_DEPOSIT_THRESHOLD, Errors.INSUFFICIENT_BRIBE);

        ProposalState proposalState = getProposalState(proposalId);
        require(proposalState == ProposalState.ACTIVE, Errors.PROPOSAL_NOT_ACTIVE);

        IERC20Upgradeable(bidAsset).safeTransferFrom(msg.sender, address(this), amount);
        potDeposits[proposalId][optionIndex][msg.sender] += amount;
        potDetails[proposalId][optionIndex] = Pot(
            0,
            uint128(amount),
            bytes32(0),
            PotType.DEPOSIT_READY
        );
        emit CreatedBribePot(proposalId, optionIndex);
    }

    /// @dev Deposit bribe against a bribe pot
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the bribe pot for that proposal
    /// @param _to address to deposit bribe to
    /// @param _amount amount to deposit
    function deposit(
        bytes32 proposalId,
        uint256 optionIndex,
        address _to,
        uint128 _amount
    ) external ifBribePotExists(proposalId, optionIndex) {
        ProposalState proposalState = getProposalState(proposalId);
        require(proposalState == ProposalState.ACTIVE, Errors.PROPOSAL_NOT_ACTIVE);

        IERC20Upgradeable(bidAsset).safeTransferFrom(msg.sender, address(this), _amount);
        unchecked {
            potDeposits[proposalId][optionIndex][_to] += _amount;
            potDetails[proposalId][optionIndex].totalDeposits += _amount;
        }
        emit DepositedBribe(proposalId, optionIndex, _to, _amount);
    }

    /// @dev submit the merkle reward and total votes. All pot not included in optionIndex and otherValidOptionIndex[] will be cancelled pots automatically
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the bribe pot
    /// @param otherValidOptionIndex Other bribe pots that a valid but not elligle for rewards.
    /// @param _merkleRoot merkle root of the reward tree
    /// @param _totalVotes total votes that have been voted for the bribe pot
    function submitMerkleRoot(
        bytes32 proposalId,
        uint256 optionIndex,
        uint256[] memory otherValidOptionIndex,
        bytes32 _merkleRoot,
        uint128 _totalVotes
    )
        external
        ifBribePotExists(proposalId, optionIndex)
        ifBribePotsExists(proposalId, otherValidOptionIndex)
        onlyOwner
    {
        ProposalState proposalState = getProposalState(proposalId);
        require(proposalState == ProposalState.ACTIVE, Errors.PROPOSAL_NOT_ACTIVE);
        require(_totalVotes != 0, Errors.ZERO_TOTAL_VOTES);
        require(_merkleRoot != bytes32(0), Errors.INVALID_MERKLE_ROOT);

        proposals[proposalId].proposalState = ProposalState.EXECUTED;
        potDetails[proposalId][optionIndex].totalVotes = _totalVotes;
        potDetails[proposalId][optionIndex].merkleRoot = _merkleRoot;
        potDetails[proposalId][optionIndex].potType = PotType.REWARD_GENERATING;

        for (uint256 index = 0; index < otherValidOptionIndex.length; index++) {
            potDetails[proposalId][otherValidOptionIndex[index]].potType = PotType.NO_PENALTY;
        }

        emit SubmittedMerkleRoot(proposalId, optionIndex, _merkleRoot, _totalVotes);
    }

    /// @dev withdraw the bribe pot when the bribe pot is cancelled or expired
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the proposal
    /// @param _receiver address of that receives the bribe deposited
    function withdraw(
        bytes32 proposalId,
        uint256 optionIndex,
        address _receiver
    ) external ifBribePotExists(proposalId, optionIndex) returns (uint256) {
        PotType potType = getPotType(proposalId, optionIndex);
        require(
            potType == PotType.NO_PENALTY || potType == PotType.SUBJECT_TO_PENALTY,
            Errors.CANNOT_WITHDRAW_BRIBE
        );

        uint128 userDeposit = uint128(potDeposits[proposalId][optionIndex][msg.sender]);
        require(userDeposit != 0, Errors.NO_DEPOSIT);
        return _withdrawBribe(proposalId, optionIndex, userDeposit, _receiver, potType);
    }

    /// @dev withdraw the bribe pot when the bribe pot is cancelled or expired
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the proposal
    /// @param userDeposit amount deposited by the user
    /// @param _receiver address of that receives the bribe deposited
    /// @param potType type of the pot
    function _withdrawBribe(
        bytes32 proposalId,
        uint256 optionIndex,
        uint128 userDeposit,
        address _receiver,
        PotType potType
    ) internal returns (uint256) {
        Pot memory pot = potDetails[proposalId][optionIndex];
        require(
            pot.totalDeposits > minimumDepositForPotRefund,
            Errors.POT_DEPOSIT_LESS_THAN_MINIMUM
        );

        uint256 amountToReceive = userDeposit;
        uint256 penalty;

        if (potType == PotType.SUBJECT_TO_PENALTY) {
            penalty = (userDeposit * cancellationPenalty) / (10**18);
            amountToReceive = userDeposit - penalty;
        }

        if (penalty != 0) {
            IERC20Upgradeable(bidAsset).safeTransfer(protocolFeeCollector, penalty);
        }

        IERC20Upgradeable(bidAsset).safeTransfer(_receiver, amountToReceive);
        potDeposits[proposalId][optionIndex][msg.sender] = 0;

        emit WithdrawDeposit(proposalId, optionIndex, amountToReceive);
        return amountToReceive;
    }

    /// @dev withdraw funds once the proposal has been dead
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the bribe pot
    /// @param _receiver address that receives the dead funds
    function withdrawDeadFunds(
        bytes32 proposalId,
        uint256 optionIndex,
        address _receiver
    ) external onlyOwner {
        PotType potType = getPotType(proposalId, optionIndex);
        require(potType == PotType.DEAD, Errors.POT_NOT_DEAD);

        uint256 totalDeposits = potDetails[proposalId][optionIndex].totalDeposits;
        require(totalDeposits != 0, Errors.NO_DEPOSIT);
        potDetails[proposalId][optionIndex].totalDeposits = 0;
        IERC20Upgradeable(bidAsset).safeTransfer(_receiver, totalDeposits);
        emit WithdrawDeadFunds(proposalId, optionIndex, totalDeposits);
    }

    /// @dev claim the rewards
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the bribe pot
    /// @param proof merkle proof of the reward tree
    /// @param leaf leaf of the tree that contains the reward
    function claimRewards(
        bytes32 proposalId,
        uint256 optionIndex,
        bytes32[] calldata proof,
        bytes calldata leaf
    ) external returns (uint256) {
        PotType potType = getPotType(proposalId, optionIndex);
        require(potType == PotType.REWARD_GENERATING, Errors.NO_REWARD_FOR_THE_POT);

        Pot memory pot = potDetails[proposalId][optionIndex];
        bytes32 merkleRoot = pot.merkleRoot;
        require(verify(proof, merkleRoot, leaf), Errors.INALID_MERKLE_PROOF);
        // verify(proof, merkleRoot, leaf);
        return _claimRewards(proposalId, optionIndex, leaf, pot);
    }

    /// @dev claim the rewards
    /// @param proposalId ID of the proposal
    /// @param optionIndex index/number of the bribe pot
    /// @param leaf leaf of the tree that contains the reward
    /// @param pot bribe pot details
    function _claimRewards(
        bytes32 proposalId,
        uint256 optionIndex,
        bytes calldata leaf,
        Pot memory pot
    ) internal returns (uint256) {
        (uint256 receipientVoteShare, address recipient) = abi.decode(leaf, (uint256, address));
        bool hasClaimedRewards = claimedReward[proposalId][optionIndex][recipient];

        require(!hasClaimedRewards, Errors.REWARD_ALREADY_CLAIMED);

        uint256 totalDeposits = pot.totalDeposits;
        uint256 totalVotes = pot.totalVotes;
        uint256 reward = (receipientVoteShare * totalDeposits) / totalVotes;
        claimedReward[proposalId][optionIndex][recipient] = true;
        uint256 fee = (reward * protocolFee) / (10**18);
        if (fee != 0) {
            IERC20Upgradeable(protocolFeeCollector).safeTransfer(recipient, fee);
        }
        IERC20Upgradeable(bidAsset).safeTransfer(recipient, reward - fee);
        emit ClaimReward(proposalId, optionIndex, recipient, reward);
        return reward;
    }

    /// @dev verify the merkle root
    /// @param proof Merkle proof
    /// @param root Merkle Root\
    /// @param leaf leaf
    function verify(
        bytes32[] memory proof,
        bytes32 root,
        bytes memory leaf
    ) public pure returns (bool) {
        bytes32 hash = keccak256(abi.encode(leaf));
        return MerkleProofUpgradeable.verify(proof, root, hash);
    }

    /// @dev set/change the cancellation penalty
    /// @param _cancellationPenalty penalty (scalled to 10**18, where 10**18 is 100%)
    function setCancellationPenalty(uint256 _cancellationPenalty) external onlyOwner {
        _setCancellationPenalty(_cancellationPenalty);
    }

    /// @dev set/change the cancellation penalty
    /// @param _cancellationPenalty penalty (scalled to 10**18, where 10**18 is 100%)
    function _setCancellationPenalty(uint256 _cancellationPenalty) internal {
        require(_cancellationPenalty < 10**18, Errors.EXCEEDS_MAX_CANCELLATION_PENALTY);
        cancellationPenalty = _cancellationPenalty;
        emit SetCancellationPenalty(_cancellationPenalty);
    }

    ///@dev set/change the minimum deposit for pot refund
    ///@param _minimumDepositForPotRefund Minimum deposit that should be available in pot for refund
    function setMinimumDepositForPotRefund(uint256 _minimumDepositForPotRefund) external onlyOwner {
        minimumDepositForPotRefund = _minimumDepositForPotRefund;
        emit SetMinimumDepositForPotRefund(_minimumDepositForPotRefund);
    }

    /// @dev set/change the protocol fee collector
    /// @param _protocolFeeCollector new address
    function setProtocolFeeCollector(address _protocolFeeCollector) external onlyOwner {
        _setProtocolFeeCollector(_protocolFeeCollector);
    }

    /// @dev set/change the protocol fee collector
    /// @param _protocolFeeCollector new address
    function _setProtocolFeeCollector(address _protocolFeeCollector) internal {
        protocolFeeCollector = _protocolFeeCollector;
        emit SetProtocolFeeCollector(_protocolFeeCollector);
    }

    ///@dev set/change the protocol fee
    /// @param _protocolFee Protocol Fee charged for successful proposals scalled to 10**18
    function setProtocolFee(uint256 _protocolFee) external onlyOwner {
        require(_protocolFee < 10**18, Errors.EXCEEDS_MAX_PROTOCOL_FEE);
        protocolFee = _protocolFee;
        emit SetProtocolFee(_protocolFee);
    }

    /// @dev check if the bribe pot for given proposal and optionIndex exists
    /// @param proposalId ID of the proposal
    /// @param optionIndex option/index of the bribe pot
    modifier ifBribePotExists(bytes32 proposalId, uint256 optionIndex) {
        require(potDetails[proposalId][optionIndex].totalDeposits != 0, Errors.INVALID_BRIBE_POT);
        _;
    }

    /// @dev check if the bribe pot for given proposal and optionIndex exists
    /// @param proposalId ID of the proposal
    /// @param optionIndexes options/indexes of the bribe pot
    modifier ifBribePotsExists(bytes32 proposalId, uint256[] memory optionIndexes) {
        for (uint256 index = 0; index < optionIndexes.length; index++) {
            require(
                potDetails[proposalId][optionIndexes[index]].totalDeposits != 0,
                Errors.INVALID_BRIBE_POT
            );
        }
        _;
    }

    /// @dev check if the bribe pot for given proposal and optionIndex does exists
    /// @param proposalId ID of the proposal
    /// @param optionIndex option/index of the bribe pot
    modifier ifBribePotNotExists(bytes32 proposalId, uint256 optionIndex) {
        require(potDetails[proposalId][optionIndex].totalDeposits == 0, Errors.INVALID_BRIBE_POT);
        _;
    }
}
