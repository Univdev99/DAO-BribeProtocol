//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;

interface IBribeSingleAssetPool {
    event Deposit(address indexed user, uint256 amount, uint256 time);

    event Withdraw(address indexed user, uint256 amount, uint256 time);

    event RewardClaimed(address indexed user, uint256 amount);

    event RewardDistributed(uint256 proposalId, uint256 amount);

    event HighestBidIncreased(
        uint256 indexed proposalId,
        address indexed prevHighestBidder,
        address indexed highestBidder,
        uint256 highestBid
    );

    event BlockProposalId(uint256 indexed proposalId, uint256 timestamp);

    event UnblockProposalId(uint256 indexed proposalId, uint256 timestamp);

    function deposit(uint256 amount) external;

    function withdraw(uint256 amount) external;

    function claimReward() external;

    function rewardBalanceOf(address user) external view returns (uint256);

    function setDelayPeriod(uint64 _delayPeriod) external;
}
