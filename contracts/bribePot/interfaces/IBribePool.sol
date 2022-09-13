//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface IBribePool {
    ///@dev When proposal is created
    ///@param proposalId ID of the proposal
    event CreatedProposal(bytes32 indexed proposalId);

    ///@dev when cancellation penalty is set/chaned
    ///@param cancellationPenalty cancellation penalty
    event SetCancellationPenalty(uint256 cancellationPenalty);

    ///@dev when protocol fee collector is set or changed
    ///@param protocolFeeCollector address that receives the protocol fee
    event SetProtocolFeeCollector(address indexed protocolFeeCollector);

    ///@dev when proposal is cancelled
    ///@param proposalId ID of the proposal
    event CancelledProposal(bytes32 indexed proposalId);

    ///@dev when a new bribe pot is created
    ///@param proposalId Id of the proposal
    ///@param optionIndex optionIndex of the bribe pot
    event CreatedBribePot(bytes32 indexed proposalId, uint256 optionIndex);

    ///@dev when a bribe is deposited against a bot
    ///@param proposalId ID of the proposa;
    ///@param optionIndex option index of the bribe pot
    ///@param to address to which the amount is tagged/deposited
    ///@param amount amount of tokens deposited
    event DepositedBribe(
        bytes32 indexed proposalId,
        uint256 optionIndex,
        address indexed to,
        uint256 amount
    );

    ///@dev when a merkle root is submitted for the given bribe pot
    ///@param proposalId ID of the proposal
    ///@param optionIndex option index of the bribe pot
    ///@param _merkleRoot merkle root of the reward tree
    ///@param _totalVotes Total Votes of voted for the given bribe pot
    event SubmittedMerkleRoot(
        bytes32 proposalId,
        uint256 optionIndex,
        bytes32 indexed _merkleRoot,
        uint256 _totalVotes
    );

    ///@dev when the deposit is withdraw from the expired bribe pot
    ///@param proposalId ID of the proposal
    ///@param optionIndex option index of the bribe pot
    ////@param amountToReceive amoutn received on withdraw
    event WithdrawDeposit(bytes32 indexed proposalId, uint256 optionIndex, uint256 amountToReceive);

    ///@dev when amount is withdrawn from the dead bribe pot
    ///@param proposalId ID of the proposal
    ///@param optionIndex option index of the bribe pot
    ///@param totalDeposits Total deposit in the bribe pot
    event WithdrawDeadFunds(bytes32 proposalId, uint256 optionIndex, uint256 totalDeposits);

    ///@dev when the reward is claimed by the snapshot user
    ///@param proposalId ID of the proposal
    ///@param optionIndex option index of the bribe pot
    ///@param recipient address that received the reward
    ///@param reward amount of tokens received in reward
    event ClaimReward(
        bytes32 indexed proposalId,
        uint256 optionIndex,
        address indexed recipient,
        uint256 reward
    );

    ///@dev when Minimum deposit for refund is changed
    ///@param minimumDepositForPotRefund Minimum deposit that should be present in bribe pot for successful refund
    event SetMinimumDepositForPotRefund(uint256 minimumDepositForPotRefund);

    ///@dev when protocol fee is changed
    ///@param protocolFee Protocol Fee charged for successful proposals
    event SetProtocolFee(uint256 protocolFee);

    /// @dev initialize the bribe pool
    /// @param _admin admin/owner of the bribe pool\
    /// @param _protocolFeeCollector address that receives the protocol fee collected
    /// @param _name name of the bribe pool
    /// @param _underlyingToken address of the bribe token
    /// @param _thresholdForCreatingBribePot minimum number of tokens required to create a bribe pot
    function initialize(
        address _admin,
        address _protocolFeeCollector,
        string calldata _name,
        address _underlyingToken,
        uint256 _thresholdForCreatingBribePot
    ) external;
}
