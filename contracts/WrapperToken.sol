//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./interfaces/IWrapperToken.sol";
import "./interfaces/IERC20Details.sol";

contract WrapperToken is ERC20Upgradeable, OwnableUpgradeable, IWrapperToken {
    struct Snapshot {
        uint256[] blockNumbers;
        uint256[] amounts;
    }

    /// @dev underlying asset
    address public underlying;

    /// @dev account balance snapshots
    mapping(address => Snapshot) private _accountBalanceSnapshots;

    function initialize(address underlying_) external override initializer {
        underlying = underlying_;

        __Ownable_init();

        __ERC20_init(
            string(abi.encodePacked("bribe-", IERC20Details(address(underlying_)).name())),
            string(abi.encodePacked("br", IERC20Details(address(underlying_)).symbol()))
        );
    }

    function mint(address user, uint256 amount) external override onlyOwner {
        _mint(user, amount);
    }

    /// @dev burn tokens
    function burn(address user, uint256 amount) external override onlyOwner {
        _burn(user, amount);
    }

    function getAccountSnapshotCount(address user) public view returns (uint256) {
        return _accountBalanceSnapshots[user].blockNumbers.length;
    }

    function getAccountSnapshot(address user)
        external
        view
        override
        returns (uint256[] memory, uint256[] memory)
    {
        return (
            _accountBalanceSnapshots[user].blockNumbers,
            _accountBalanceSnapshots[user].amounts
        );
    }

    /// @dev _beforeTokenTransfer
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override {
        if (from == to) {
            return;
        }

        if (from != address(0)) {
            uint256 currentBalance = balanceOf(from);
            _updateAccountSnapshot(from, currentBalance, currentBalance - amount);
        }

        if (to != address(0)) {
            uint256 currentBalance = balanceOf(to);
            _updateAccountSnapshot(to, currentBalance, currentBalance + amount);
        }
    }

    function _updateAccountSnapshot(
        address account,
        uint256 oldValue,
        uint256 newValue
    ) private {
        _updateSnapshot(_accountBalanceSnapshots[account], newValue);

        emit UpdateSnapshot(account, oldValue, newValue, block.timestamp);
    }

    function _updateSnapshot(Snapshot storage userSnapshots, uint256 newValue) internal {
        uint256 currrentBlockNumber = block.number;

        uint256 size = userSnapshots.blockNumbers.length;

        // multiple snapshots in the current block
        if (size > 0 && userSnapshots.blockNumbers[size - 1] == currrentBlockNumber) {
            userSnapshots.amounts[size - 1] = newValue;
        } else {
            userSnapshots.blockNumbers.push(currrentBlockNumber);
            userSnapshots.amounts.push(newValue);
        }
    }

    /// @dev getDepositAt user deposit at blockNumber or closest to blockNumber
    function getDepositAt(address user, uint256 blockNumber)
        external
        view
        override
        returns (uint256 amount)
    {
        Snapshot storage userSnapshots = _accountBalanceSnapshots[user];
        uint256 size = userSnapshots.blockNumbers.length;

        if (size == 0) return 0;

        // check if the user latest and least deposit are within range of blockNumber
        if (userSnapshots.blockNumbers[0] > blockNumber) return 0;
        if (userSnapshots.blockNumbers[size - 1] <= blockNumber)
            return userSnapshots.amounts[size - 1];

        return _searchByBlockNumber(userSnapshots, size, blockNumber);
    }

    /// @dev _searchByProposalId searches the reward snapshot by blockNumber. Uses binary search.
    /// @param snapshot reward
    /// @param blockNumber proposalId
    function _searchByBlockNumber(
        Snapshot storage snapshot,
        uint256 snapshotSize,
        uint256 blockNumber
    ) internal view returns (uint256 amount) {
        uint256 lower = 0;
        uint256 upper = snapshotSize - 1;

        while (upper > lower) {
            uint256 center = upper - (upper - lower) / 2; // ceil, avoiding overflow
            if (snapshot.blockNumbers[center] == blockNumber) {
                return snapshot.amounts[center];
            } else if (snapshot.blockNumbers[center] < blockNumber) {
                lower = center;
            } else {
                upper = center - 1;
            }
        }

        return snapshot.amounts[lower];
    }

    /// @dev _transfer Transfer not allowed
    function _transfer(
        address, /*sender*/
        address, /*recipient*/
        uint256 /*amount*/
    ) internal pure override {
        revert("TRANSFER_NOT_ALLOWED");
    }

    /// @dev approve Approve not allowed
    function approve(
        address, /*spender*/
        uint256 /*amount*/
    ) public pure override(ERC20Upgradeable, IERC20Upgradeable) returns (bool) {
        revert("APPROVE_NOT_ALLOWED");
    }
}
