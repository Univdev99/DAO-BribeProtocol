//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IExecutorWithTimelock} from "../interfaces/Aave/IExecutorWithTimelock.sol";

contract MockAaveGovernanceWithTokens {
    enum ProposalState {
        Pending,
        Canceled,
        Active,
        Failed,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    struct Vote {
        bool support;
        uint248 votingPower;
    }

    struct ProposalWithoutVotes {
        uint256 id;
        address creator;
        IExecutorWithTimelock executor;
        address[] targets;
        uint256[] values;
        string[] signatures;
        bytes[] calldatas;
        bool[] withDelegatecalls;
        uint256 startBlock;
        uint256 endBlock;
        uint256 executionTime;
        uint256 forVotes;
        uint256 againstVotes;
        bool executed;
        bool canceled;
        address strategy;
        bytes32 ipfsHash;
    }

    mapping(uint256 => uint256) proposals;
    mapping(uint256 => bool) internal cancelled;

    IERC20 public receiptAaveToken;

    IERC20 public receiptstkAaveToken;

    function setReceiptTokens(IERC20 receiptAaveToken_, IERC20 receiptstkAaveToken_) public {
        receiptAaveToken = receiptAaveToken_;
        receiptstkAaveToken = receiptstkAaveToken_;
    }

    function createProposal(uint256 proposalId) external {
        proposals[proposalId] = block.number;
    }

    function submitVote(uint256 proposalId, bool support) external {}

    function getProposalById(uint256 proposalId)
        external
        view
        returns (ProposalWithoutVotes memory p)
    {
        p = ProposalWithoutVotes(
            proposalId,
            address(0),
            IExecutorWithTimelock(address(0)),
            new address[](0),
            new uint256[](0),
            new string[](0),
            new bytes[](0),
            new bool[](0),
            proposals[proposalId],
            proposals[proposalId] + 6232,
            0,
            0,
            0,
            false,
            false,
            address(0),
            bytes32(0)
        );
    }

    function getProposalState(uint256 proposalId) external view returns (ProposalState) {
        if (cancelled[proposalId] == true) {
            return ProposalState.Canceled;
        }
        return ProposalState.Active;
    }

    function getGovernanceStrategy() external view returns (address) {
        return (address(this));
    }

    function cancel(uint256 proposalId) external {
        cancelled[proposalId] = true;
    }

    function getVotingPowerAt(address, uint256) external view returns (uint256) {
        return receiptAaveToken.totalSupply() + receiptstkAaveToken.totalSupply();
    }
}
