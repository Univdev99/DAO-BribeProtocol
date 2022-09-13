//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/proxy/ClonesUpgradeable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IBribePool.sol";

import "../helper/Errors.sol";

////////////////////////////////////////////////////////////////////////////////////////////
///
/// @title Bribe Pool Factory
/// @author contact@bribe.xyz
/// @notice
///
////////////////////////////////////////////////////////////////////////////////////////////

contract BribePoolFactory is Ownable {
    /// @dev address of the token used to bribe
    address public immutable underlyingToken;

    /// @dev implementation address of the bribe pool contract
    address public bribePoolImplementation;

    /// @dev mapping of bribe pools to it's addresses
    mapping(string => address) public bribePools;

    event CreatedNewBribePool(address indexed bribePool, string indexed protocolName);
    event ChangeBribePoolImplementation(address bribePoolImplementation);

    /// @dev initialize the bribe pool factory. can be called only once
    /// @param _admin contract admin
    /// @param _bribePoolImplementation implementation address of the bribe pool contract
    /// @param _underlyingToken address of the token used to bribe (will be usdc)
    constructor(
        address _admin,
        address _bribePoolImplementation,
        address _underlyingToken
    ) Ownable() {
        super.transferOwnership(_admin);
        bribePoolImplementation = _bribePoolImplementation;
        underlyingToken = _underlyingToken;
    }

    function renounceOwnership() public pure override {
        revert(Errors.CANT_RENOUNCE_OWNERSHIP);
    }

    /// @dev create a new bribe pool (ex: AavePool, CompoundPool)
    /// @param _protocolName name of pool
    /// @param bribePoolOwner owner the new bribe pool that will be created
    /// @param protocolFeeCollector address which recevies the protocol fee generated from the bribe pool
    /// @param thresholdForCreatingBribePot minimum number of tokens required for creating a new bribe pot
    function createBribePool(
        string calldata _protocolName,
        address bribePoolOwner,
        address protocolFeeCollector,
        uint128 thresholdForCreatingBribePot
    ) external onlyOwner returns (address) {
        address newClone = ClonesUpgradeable.clone(bribePoolImplementation);
        IBribePool(newClone).initialize(
            bribePoolOwner,
            protocolFeeCollector,
            _protocolName,
            underlyingToken,
            thresholdForCreatingBribePot
        );
        bribePools[_protocolName] = newClone;
        emit CreatedNewBribePool(newClone, _protocolName);
        return newClone;
    }

    /// @dev change bribe pool implementation address
    /// @param _newBribePoolImplementation implementation address of the new bribe pool contract
    function changeBribePoolImplementation(address _newBribePoolImplementation) external onlyOwner {
        bribePoolImplementation = _newBribePoolImplementation;
        emit ChangeBribePoolImplementation(_newBribePoolImplementation);
    }
}
