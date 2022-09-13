//SPDX-License-Identifier: Unlicense

pragma solidity 0.8.4;

import "./BribeSingleAssetPool.sol";

contract SampleSingleAsset is BribeSingleAssetPool {
    uint256 public constant expiration = 60;

    constructor(
        string memory _name,
        string memory _symbol,
        IERC20 _governanceToken,
        IERC20 _bidAsset,
        uint64 _delayPeriod
    ) BribeSingleAssetPool(_name, _symbol, _governanceToken, _bidAsset, _delayPeriod) {}

    function getAuctionExpiration(
        uint256 /*proposalId*/
    ) internal view override returns (uint256) {
        return block.timestamp + expiration;
    }

    function vote(
        uint256 proposalId,
        bool /*support*/
    ) external {
        distributeRewards(proposalId);
        afterVote();
    }
}
