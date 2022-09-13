// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPool {
    IERC20 public asset;
    bool transfer;

    constructor(address asset_, bool transfer_) {
        asset = IERC20(asset_);
        transfer = transfer_;
    }

    function withdrawFees() public returns (uint256 amount) {
        amount = asset.balanceOf(address(this));
        if (transfer) {
            asset.transfer(msg.sender, amount);
        }
    }
}
