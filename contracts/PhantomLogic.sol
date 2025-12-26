// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title Phantom Logic
/// @notice A small on-chain quiz where scores and answers are encrypted with Zama FHE.
contract PhantomLogic is ZamaEthereumConfig {
    uint8 public constant QUESTION_COUNT = 4;
    uint8 public constant OPTION_COUNT = 4;

    uint32 public constant STARTING_SCORE = 100;
    uint32 public constant PERFECT_BONUS = 100;

    struct GameState {
        bool started;
        bool completed;
        uint8 answeredMask;
        euint32 score;
        euint8 a0;
        euint8 a1;
        euint8 a2;
        euint8 a3;
    }

    mapping(address => GameState) private _states;

    event GameStarted(address indexed player);
    event AnswerSubmitted(address indexed player, uint8 indexed questionId);
    event GameCompleted(address indexed player);

    /// @notice Start the game. The player receives an encrypted starting score of 100.
    function startGame() external {
        GameState storage state = _states[msg.sender];
        require(!state.started, "Game already started");

        state.started = true;
        state.completed = false;
        state.answeredMask = 0;

        state.a0 = FHE.asEuint8(0);
        state.a1 = FHE.asEuint8(0);
        state.a2 = FHE.asEuint8(0);
        state.a3 = FHE.asEuint8(0);

        state.score = FHE.asEuint32(STARTING_SCORE);
        FHE.allowThis(state.score);
        FHE.allow(state.score, msg.sender);

        emit GameStarted(msg.sender);
    }

    /// @notice Submit an encrypted answer (an option index in [1..4]) for a given question.
    /// @param questionId The question index [0..3]
    /// @param option The encrypted selected option index
    /// @param inputProof Zama input proof
    function submitAnswer(uint8 questionId, externalEuint8 option, bytes calldata inputProof) external {
        require(questionId < QUESTION_COUNT, "Invalid question");

        GameState storage state = _states[msg.sender];
        require(state.started, "Game not started");
        require(!state.completed, "Game completed");

        uint8 bit = uint8(1 << questionId);
        require((state.answeredMask & bit) == 0, "Already answered");

        euint8 choice = FHE.fromExternal(option, inputProof);
        FHE.allowThis(choice);

        if (questionId == 0) state.a0 = choice;
        else if (questionId == 1) state.a1 = choice;
        else if (questionId == 2) state.a2 = choice;
        else state.a3 = choice;

        state.answeredMask |= bit;
        emit AnswerSubmitted(msg.sender, questionId);

        if (state.answeredMask == 0x0F) {
            _finalize(state);
            emit GameCompleted(msg.sender);
        }
    }

    /// @notice Returns plaintext status for a player.
    /// @dev View functions must not use msg.sender. Always pass the address explicitly.
    function getGameState(address player) external view returns (bool started, bool completed, uint8 answeredMask) {
        GameState storage state = _states[player];
        return (state.started, state.completed, state.answeredMask);
    }

    /// @notice Returns the encrypted score handle for a player.
    /// @dev The caller must have ACL permission to decrypt (granted during game actions).
    function scoreOf(address player) external view returns (euint32) {
        return _states[player].score;
    }

    function _finalize(GameState storage state) internal {
        ebool c0 = FHE.eq(state.a0, FHE.asEuint8(1));
        ebool c1 = FHE.eq(state.a1, FHE.asEuint8(1));
        ebool c2 = FHE.eq(state.a2, FHE.asEuint8(2));
        ebool c3 = FHE.eq(state.a3, FHE.asEuint8(2));

        ebool allCorrect = FHE.and(FHE.and(c0, c1), FHE.and(c2, c3));

        euint32 bonus = FHE.asEuint32(PERFECT_BONUS);
        state.score = FHE.select(allCorrect, FHE.add(state.score, bonus), state.score);
        state.completed = true;

        FHE.allowThis(state.score);
        FHE.allow(state.score, msg.sender);
    }
}

