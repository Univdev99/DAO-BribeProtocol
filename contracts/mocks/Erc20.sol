// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Erc20 is ERC20 {
    mapping(address => uint256) private rewards;

    constructor() ERC20("Testing", "TEST") {}

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }

    function mintTo(address sender, uint256 amount) external {
        _mint(sender, amount);
    }

    function getTotalRewardsBalance(address staker) external view returns (uint256) {
        return rewards[staker];
    }

    function setReward(address to, uint256 value) external {
        _mint(to, value);
        rewards[to] = value;
    }

    function claimRewards(address to, uint256) external {
        rewards[to] = 0;
    }
}
