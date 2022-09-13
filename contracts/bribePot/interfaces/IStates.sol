//SPDX-License-Identifier: MIT

pragma solidity 0.8.4;

interface States {
    enum ProposalState {
        NOT_CREATED,
        ACTIVE,
        EXPIRED,
        EXECUTED,
        CANCELLED,
        DEAD
    }

    enum PotType {
        NOT_CREATED,
        DEPOSIT_READY,
        REWARD_GENERATING,
        NO_PENALTY,
        SUBJECT_TO_PENALTY,
        DEAD
    }
}
