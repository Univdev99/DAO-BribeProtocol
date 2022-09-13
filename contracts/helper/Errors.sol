//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

library Errors {
    string public constant CANT_RENOUNCE_OWNERSHIP = "1"; // CAN NOT RENOUNCE THE OWNERSHIP
    string public constant NOT_VALID_BRIBE_POOL = "2"; // NOT A VALID BRIBE POOL
    string public constant INVALID_EXPIRY_TIME = "3"; // EXPIRY SHOULD ALWAYS BE MORE THANT THE CURRENT TIMESTMAP
    string public constant PROPOSAL_ALREADY_CREATED = "4"; // PROPOSAL HAS ALREADY BEEN CREATED
    string public constant PROPOSAL_NOT_ACTIVE = "5"; // PROPOSAL IS NOT ACTIVE
    string public constant INSUFFICIENT_BRIBE = "6"; // INSUFFICIENT BRIBE
    string public constant ZERO_TOTAL_VOTES = "7"; // TOTAL VOTES CAN NOT BE ZERO
    string public constant INVALID_MERKLE_ROOT = "8"; // INVALID MERKLE ROOT
    string public constant ONLY_EXPIRED_OR_CANCELLED_PROPOSAL = "9"; // ONLY EXPIRED OR CANCELLED PROPOSAL
    string public constant NO_DEPOSIT = "10"; // NO DEPOSIT EXISTS
    string public constant POT_NOT_DEAD = "11"; // POT IS NOT DEAD
    string public constant PROPOSAL_NOT_EXECUTED = "12"; // PROPOSAL IS NOT EXECUTED
    string public constant REWARD_ALREADY_CLAIMED = "13"; // REWARD IS ALREADY CLAIMED
    string public constant EXCEEDS_MAX_CANCELLATION_PENALTY = "14"; // EXCEED THE MAX PERMISSIBLE CANCELLATION PENALTY
    string public constant INVALID_BRIBE_POT = "15"; // INVALID BRIBE POT
    string public constant CALLER_NOT_BRIBE_POOL_FACTORY = "16"; // ONLY BRIBE POOL FACTORY CAN CALL THE CONTRACT
    string public constant EXCEEDS_MAX_PROTOCOL_FEE = "15"; // EXCEEDS MAX PROTOCOL FEE
    string public constant POT_DEPOSIT_LESS_THAN_MINIMUM = "16"; // POT DEPOSIT IS LESS THAN MINIMUM DEPOSIT
    string public constant INALID_MERKLE_PROOF = "17"; // INVALID MERKLE PROOF
    string public constant NO_REWARD_FOR_THE_POT = "18"; // THE POT HAS NO REWARDS
    string public constant CANNOT_WITHDRAW_BRIBE = "19"; // CAN'T WITHDRAW PROPOAL
    string public constant ZERO_THRESHOLD = "20"; // THRESHOLD CAN NOT BE ZERO
}
