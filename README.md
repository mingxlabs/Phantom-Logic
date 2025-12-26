# Phantom Logic

Privacy-first logic quiz built on Zama FHEVM. Players start with encrypted points, submit encrypted answers, and earn an
encrypted bonus for a perfect score.

## Overview

Phantom Logic is a short, on-chain quiz game that demonstrates how Fully Homomorphic Encryption (FHE) can be used to
protect player choices and scores while keeping the gameplay verifiable. The game uses four logic questions, each with
four options. Players select exactly one option per question, and the correct pattern is 1, 1, 2, 2. Answers and scores
remain encrypted end-to-end.

## The Problem This Solves

Traditional on-chain quizzes leak answers and player choices because calldata and storage are transparent. That makes
fair play impossible and prevents privacy-sensitive gameplay. Phantom Logic addresses this by encrypting every answer
and score on-chain, so participants can play without revealing their selections or points.

## Advantages

- **Answer privacy**: Every submitted option is encrypted using Zama FHE input proofs.
- **Score privacy**: Player scores remain encrypted in storage and are only decryptable by authorized viewers.
- **Verifiable outcomes**: Correctness checks happen on-chain over encrypted values.
- **Simple, auditable rules**: Fixed question count and scoring logic reduce ambiguity.
- **No hidden server**: Core game logic is fully on-chain.

## Key Features

- 4 questions, 4 options each, single choice per question
- Correct option sequence: 1, 1, 2, 2
- Starting score: 100 (encrypted)
- Perfect bonus: +100 if all answers match
- Encrypted answer submission and encrypted scoring
- Per-player game state with answered bitmask and completion status

## Tech Stack

- **Smart contracts**: Solidity + Hardhat + hardhat-deploy
- **FHE**: Zama FHEVM (`@fhevm/solidity`)
- **Frontend**: React + Vite
- **Wallet/UX**: RainbowKit + Wagmi
- **Reads**: viem
- **Writes**: ethers
- **Relayer**: `@zama-fhe/relayer-sdk`

## Architecture

### On-Chain Contracts

The main contract is `PhantomLogic.sol` in `contracts/`. It:

- Creates an encrypted starting score when the game begins
- Stores encrypted answers for each question
- Computes correctness using encrypted comparisons
- Applies a bonus only if all answers are correct
- Exposes encrypted score handles for authorized decryption

Events:

- `GameStarted(player)`
- `AnswerSubmitted(player, questionId)`
- `GameCompleted(player)`

### Frontend

The frontend lives in `frontend/` and is built on the following rules:

- Uses **ethers** for all contract writes (transactions)
- Uses **viem** for all contract reads
- No Tailwind CSS
- No localStorage usage
- No JSON files inside `frontend/`
- No environment variables in the frontend
- No imports from the repository root

### Encryption & Privacy Flow

1. The frontend uses the Zama relayer to encrypt the chosen option and produce an input proof.
2. The contract converts external ciphertext into internal encrypted values.
3. All correctness checks are done over encrypted values.
4. Scores remain encrypted and are only decryptable by ACL-authorized users.

## Game Flow

1. Player calls `startGame()` and receives an encrypted score of 100.
2. Player answers each question with an encrypted option index.
3. Once all four answers are submitted, the contract checks the encrypted answers.
4. If all are correct (1, 1, 2, 2), a 100-point encrypted bonus is added.
5. The game is marked complete.

## Repository Layout

```
contracts/             # Solidity contracts (PhantomLogic.sol)
deploy/                # Deployment scripts
tasks/                 # Hardhat tasks
test/                  # Contract tests
frontend/              # React + Vite application
docs/                  # Zama references
deployments/           # Network deployments (includes ABI files)
```

## Prerequisites

- Node.js 20+
- npm
- A funded Sepolia account for deployments

## Installation

```bash
npm install
```

## Compile and Test

Run the Hardhat tasks and tests locally before any Sepolia deployment:

```bash
npm run compile
npm run test
```

## Local Node Deployment

```bash
npm run chain
npm run deploy:localhost
```

## Sepolia Deployment

This project deploys using a private key (no mnemonic). The environment variables are loaded in Hardhat using:

```ts
import * as dotenv from "dotenv";
dotenv.config();
```

Required variables:

- `INFURA_API_KEY`
- `PRIVATE_KEY`

Deploy:

```bash
npm run deploy:sepolia
```

## Frontend Development

```bash
cd frontend
npm install
npm run dev
```

Notes:

- The frontend targets the network configured in code (no localhost network).
- The contract ABI must be copied from `deployments/sepolia` into the frontend code.
- All reads use viem and all writes use ethers.

## Scripts

Root scripts:

- `npm run compile`
- `npm run test`
- `npm run deploy:localhost`
- `npm run deploy:sepolia`
- `npm run verify:sepolia`

Frontend scripts:

- `npm run dev` (inside `frontend/`)
- `npm run build`
- `npm run preview`

## Limitations

- Fixed question set and fixed correct answers (1, 1, 2, 2)
- Encrypted answers are not publicly readable by design
- No leaderboard or public scoring board yet

## Future Plans

- Configurable question sets and answer keys
- Multiple game sessions per player
- Privacy-preserving leaderboard with optional opt-in reveal
- Improved gas efficiency and batched answer submission
- Expanded UX around encryption progress and error handling
- Additional networks supported by Zama FHEVM

## License

BSD-3-Clause-Clear. See `LICENSE`.
