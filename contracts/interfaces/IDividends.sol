// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface IDividends {
    event Stake(
        address indexed dividend,
        address indexed sender,
        address indexed to,
        uint256 amount
    );

    event Unstake(address indexed user, uint256 amount);

    event ClaimDividend(address indexed user, uint256 amount);

    event RescueFunds(uint256 balance);

    event DistributeDividend(uint256 amount);

    event UpdateFeeDistributor(address newFeeDistribution);

    function stake(
        address to,
        uint128 amount,
        bool update
    ) external;
}
