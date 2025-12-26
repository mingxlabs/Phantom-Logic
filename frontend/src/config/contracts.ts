/* This file is auto-generated from hardhat-deploy deployments/sepolia. */
/* Run: npx hardhat --network sepolia phantom:sync-frontend */

export const CONTRACT_CHAIN_ID = 11155111 as const;
export const CONTRACT_ADDRESS = '0x3C6D545C9b4A0c63Ed1045fEbab6D1e86a1Da4A4' as const;
export const CONTRACT_ABI = [
  {
    inputs: [],
    name: 'OPTION_COUNT',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'PERFECT_BONUS',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'QUESTION_COUNT',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'STARTING_SCORE',
    outputs: [{ internalType: 'uint32', name: '', type: 'uint32' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'address', name: 'player', type: 'address' },
      { indexed: true, internalType: 'uint8', name: 'questionId', type: 'uint8' },
    ],
    name: 'AnswerSubmitted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'player', type: 'address' }],
    name: 'GameCompleted',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, internalType: 'address', name: 'player', type: 'address' }],
    name: 'GameStarted',
    type: 'event',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'getGameState',
    outputs: [
      { internalType: 'bool', name: 'started', type: 'bool' },
      { internalType: 'bool', name: 'completed', type: 'bool' },
      { internalType: 'uint8', name: 'answeredMask', type: 'uint8' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'address', name: 'player', type: 'address' }],
    name: 'scoreOf',
    outputs: [{ internalType: 'euint32', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'startGame', outputs: [], stateMutability: 'nonpayable', type: 'function' },
  {
    inputs: [
      { internalType: 'uint8', name: 'questionId', type: 'uint8' },
      { internalType: 'externalEuint8', name: 'option', type: 'bytes32' },
      { internalType: 'bytes', name: 'inputProof', type: 'bytes' },
    ],
    name: 'submitAnswer',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

