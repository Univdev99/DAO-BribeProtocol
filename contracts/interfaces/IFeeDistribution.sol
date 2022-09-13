//SPDX-License-Identifier: Unlicense
pragma solidity 0.8.4;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IFeeDistribution {
    struct FeeReceiver {
        /// @dev pending reward to be claimed
        uint128 pendingReward;
        /// @dev percentage of the fees
        uint128 allocPoint;
        /// @dev price per share
        uint256 lastPricePerShare;
    }

    event SetFeeReceiver(
        address indexed receiver,
        uint256 currentAllocPoint,
        uint256 newAllocPoint
    );

    event FeesTransferred(address indexed receiver, uint256 feeShare, uint256 timestamp);

    event RescueFunds(address sender, uint256 amount);

    event ClaimFees(uint256 receivedFees, uint256 totalFeesReceived);

    function distributeFeeTo(address to) external returns (uint256 feeShare);
}
