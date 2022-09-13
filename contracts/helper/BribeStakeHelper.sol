//SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/IBribeExecutor.sol";
import "../interfaces/IDividends.sol";

contract BribeStakeHelper is IBribeExecutor {
    using SafeERC20 for IERC20;

    /// @dev staking contract
    IDividends public immutable staking;

    /// @dev stake token
    IERC20 public immutable bribeToken;

    constructor(IERC20 bribeToken_, IDividends staking_) {
        staking = staking_;
        bribeToken = bribeToken_;
    }

    /// @dev execute Stakes the bribe token
    ///
    /// NOTE: Do not transfer tokens to this contract directly
    /// without calling execute function
    ///
    ///
    /// @param user user address
    /// @param amount amount transferred to the contract
    function execute(
        address user,
        uint256 amount,
        bytes calldata /*data*/
    ) external override {
        bribeToken.safeApprove(address(staking), amount);
        staking.stake(user, uint128(amount), false);
    }
}
