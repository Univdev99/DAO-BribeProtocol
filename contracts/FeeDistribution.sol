//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;
import "@openzeppelin/contracts/utils/math/SafeCast.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IFeeDistributor.sol";
import "./interfaces/IFeeDistribution.sol";

////////////////////////////////////////////////////////////////////////////////////////////
///
/// @title FeeDistribution
/// @author contact@bribe.xyz
/// @notice
///
////////////////////////////////////////////////////////////////////////////////////////////

contract FeeDistribution is IFeeDistribution, Ownable, Pausable {
    using SafeCast for uint256;
    using SafeERC20 for IERC20;

    uint256 private constant SHARE_SCALE = 1e12;

    /// @dev fee asset
    IERC20 public immutable feeAsset;

    /// @dev fee receiver to distribution configuration
    mapping(address => FeeReceiver) public feeReceiverData;

    /// @dev total distribution allocation points
    uint128 public totalAllocPoints;

    /// @dev total fees received
    uint128 public totalFeesReceived;

    /// @dev price peer share
    uint256 public pricePerShare;

    constructor(IERC20 feeAsset_) Ownable() {
        require(address(feeAsset_) != address(0), "INVALID_FEE_ASSET");
        feeAsset = feeAsset_;
    }

    /// @dev setFeeReceivers
    /// @param receivers address to send fees
    /// @param allocPoints address alloc point
    function setFeeReceivers(address[] calldata receivers, uint128[] calldata allocPoints)
        external
        onlyOwner
    {
        require(receivers.length == allocPoints.length, "INVALID_SIZE");

        uint256 size = receivers.length;

        for (uint256 i = 0; i < size; i++) {
            address receiver = receivers[i];
            uint128 newAllocPoint = allocPoints[i];
            uint256 currentAllocPoint = feeReceiverData[receiver].allocPoint;

            if (currentAllocPoint == 0) {
                // if a new use totalFeesReceived
                _setFeeReceiver(receiver, newAllocPoint, pricePerShare);
            } else {
                // else use the asset last withdraw index
                _accrue(receiver);
                _setFeeReceiver(receiver, newAllocPoint, pricePerShare);
            }

            emit SetFeeReceiver(receiver, currentAllocPoint, newAllocPoint);
        }
    }

    /// @dev rescueFunds
    /// @notice Allows the owner to rescue funds in the contract
    function rescueFunds(address to) external onlyOwner {
        uint256 amount = feeAsset.balanceOf(address(this));
        if (amount > 0) {
            feeAsset.safeTransfer(to, amount);
            emit RescueFunds(address(this), amount);
        }
    }

    /// @dev claimFees
    /// @param pools pools to claim fees from
    function claimFees(IFeeDistributor[] calldata pools) external whenNotPaused {
        uint256 size = pools.length;
        uint256 prevBalance = feeAsset.balanceOf(address(this));

        uint256 receivedFees;
        for (uint256 i = 0; i < size; i++) {
            receivedFees += pools[i].withdrawFees().toUint128();
        }

        // assert that the fees was transferred
        require(feeAsset.balanceOf(address(this)) - prevBalance >= receivedFees, "INVALID_CLAIM");

        totalFeesReceived += receivedFees.toUint128();

        require(totalAllocPoints > 0, "NO_RECEIVERS");

        pricePerShare += (receivedFees * SHARE_SCALE) / totalAllocPoints;

        emit ClaimFees(receivedFees, totalFeesReceived);
    }

    function _accrue(address receiver) internal {
        feeReceiverData[receiver].pendingReward += _calculateFeeShare(receiver);
        feeReceiverData[receiver].lastPricePerShare = pricePerShare;
    }

    /// @dev distributeFeeTo
    /// @notice distribute accrued fees to the msg.sender
    function distributeFeeTo(address to)
        public
        override
        whenNotPaused
        returns (uint256 pendingReward)
    {
        address receiver = msg.sender;

        require(feeReceiverData[receiver].allocPoint > 0, "INVALID_RECEIVER");
        if (totalFeesReceived == 0) return 0;

        _accrue(receiver);

        pendingReward = feeReceiverData[receiver].pendingReward;

        // transfer feeShare
        if (pendingReward > 0) {
            feeReceiverData[receiver].pendingReward = 0;
            feeAsset.safeTransfer(to, pendingReward);
        }

        emit FeesTransferred(receiver, pendingReward, block.timestamp);
    }

    /// @notice pause actions
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice unpause actions
    function unpause() external onlyOwner {
        _unpause();
    }

    /// @dev _calculateFeeShare
    /// @param receiver receiver address
    function _calculateFeeShare(address receiver) internal view returns (uint128 fees) {
        uint256 lastPricePerShare = feeReceiverData[receiver].lastPricePerShare;
        uint256 allocPoint = feeReceiverData[receiver].allocPoint;

        uint128 rewardDebt = ((allocPoint * lastPricePerShare) / SHARE_SCALE).toUint128();
        fees = (((allocPoint * pricePerShare) / SHARE_SCALE) - rewardDebt).toUint128();
    }

    /// @dev setFeeReceiver
    /// @param feeReceiver address that receive the fee
    /// @param newAllocPoint percentage of the fees the address receives
    function _setFeeReceiver(
        address feeReceiver,
        uint128 newAllocPoint,
        uint256 lastPricePerShare
    ) internal {
        FeeReceiver storage config = feeReceiverData[feeReceiver];
        uint128 currentAllocPoint = config.allocPoint;

        if (currentAllocPoint > 0) {
            totalAllocPoints -= currentAllocPoint;
            totalAllocPoints += newAllocPoint;
            config.allocPoint = newAllocPoint;
        } else {
            totalAllocPoints += newAllocPoint;
            config.allocPoint = newAllocPoint;
        }

        config.lastPricePerShare = lastPricePerShare;

        emit SetFeeReceiver(feeReceiver, currentAllocPoint, newAllocPoint);
    }
}
