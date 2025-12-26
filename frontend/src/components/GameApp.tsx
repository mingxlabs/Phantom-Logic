import { useMemo, useState } from 'react';
import { Contract } from 'ethers';
import { useAccount, useReadContract } from 'wagmi';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import { CONTRACT_ABI, CONTRACT_ADDRESS } from '../config/contracts';
import { Header } from './Header';
import '../styles/GameApp.css';

type Question = {
  id: number;
  title: string;
  prompt: string;
  options: [string, string, string, string];
};

const QUESTIONS: Question[] = [
  {
    id: 0,
    title: 'Question 1',
    prompt: 'If all Bloops are Razzies, and all Razzies are Lazzies, what must be true?',
    options: [
      'All Bloops are Lazzies.',
      'All Lazzies are Bloops.',
      'Some Bloops are not Razzies.',
      'No Bloops are Lazzies.',
    ],
  },
  {
    id: 1,
    title: 'Question 2',
    prompt: 'What is the logical negation of “All swans are white”?',
    options: [
      'At least one swan is not white.',
      'No swans are white.',
      'All swans are not white.',
      'Some swans are white.',
    ],
  },
  {
    id: 2,
    title: 'Question 3',
    prompt: 'If P → Q is true and P is true, what follows?',
    options: [
      'P is false.',
      'Q is true.',
      'Q is false.',
      'P → Q is false.',
    ],
  },
  {
    id: 3,
    title: 'Question 4',
    prompt: 'Which number is prime?',
    options: ['9', '11', '15', '21'],
  },
];

function isConfiguredAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address) && address !== '0x0000000000000000000000000000000000000000';
}

export function GameApp() {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const { instance, isLoading: zamaLoading, error: zamaError } = useZamaInstance();

  const [selected, setSelected] = useState<Record<number, number>>({});
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [decrypting, setDecrypting] = useState(false);
  const [score, setScore] = useState<string | null>(null);

  const configured = useMemo(() => isConfiguredAddress(CONTRACT_ADDRESS), []);

  const { data: gameState } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getGameState',
    args: address ? [address] : undefined,
    query: { enabled: !!address && configured },
  });

  const { data: encryptedScore } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'scoreOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && configured },
  });

  const started = (gameState as any)?.[0] ?? false;
  const completed = (gameState as any)?.[1] ?? false;
  const answeredMask: number = Number((gameState as any)?.[2] ?? 0);

  const isAnswered = (questionId: number) => (answeredMask & (1 << questionId)) !== 0;

  const getContract = async () => {
    const signer = await signerPromise;
    if (!signer) throw new Error('Wallet signer not available');
    return new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
  };

  const startGame = async () => {
    if (!configured) return;
    try {
      setPendingTx('Starting game…');
      const contract = await getContract();
      const tx = await contract.startGame();
      await tx.wait();
      setPendingTx(null);
      setScore(null);
    } catch (e) {
      setPendingTx(null);
      alert(e instanceof Error ? e.message : 'Failed to start game');
    }
  };

  const submitAnswer = async (questionId: number) => {
    if (!configured) return;
    if (!instance || !address) {
      alert('Encryption service or wallet not ready');
      return;
    }

    const option = selected[questionId];
    if (!option || option < 1 || option > 4) {
      alert('Select exactly one option');
      return;
    }

    try {
      setPendingTx(`Submitting answer for question ${questionId + 1}…`);

      const input = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      input.add8(option);
      const encrypted = await input.encrypt();

      const contract = await getContract();
      const tx = await contract.submitAnswer(questionId, encrypted.handles[0], encrypted.inputProof);
      await tx.wait();

      setPendingTx(null);
      setScore(null);
    } catch (e) {
      setPendingTx(null);
      alert(e instanceof Error ? e.message : 'Failed to submit answer');
    }
  };

  const decryptScore = async () => {
    if (!configured) return;
    if (!instance || !address || !encryptedScore || !signerPromise) {
      alert('Missing required components for decryption');
      return;
    }

    const handle = encryptedScore as string;
    if (handle === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      setScore('0');
      return;
    }

    setDecrypting(true);
    try {
      const keypair = instance.generateKeypair();
      const handleContractPairs = [{ handle, contractAddress: CONTRACT_ADDRESS }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signer = await signerPromise;
      if (!signer) throw new Error('Signer not available');

      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const value = result[handle] ?? '0';
      setScore(value.toString());
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to decrypt score');
    } finally {
      setDecrypting(false);
    }
  };

  return (
    <div className="app-shell">
      <Header />

      <main className="main">
        <div className="container">
          <section className="card">
            <div className="card-header">
              <h2 className="card-title">Encrypted Score</h2>
              <div className="card-actions">
                <button
                  className="button"
                  onClick={decryptScore}
                  disabled={!address || !configured || !encryptedScore || decrypting}
                >
                  {decrypting ? 'Decrypting…' : 'Decrypt'}
                </button>
              </div>
            </div>

            {!configured && (
              <div className="notice">
                <div className="notice-title">Contract not configured</div>
                <div className="notice-body">
                  Deploy to Sepolia and run <code>npx hardhat --network sepolia phantom:sync-frontend</code>.
                </div>
              </div>
            )}

            <div className="score-grid">
              <div>
                <div className="label">Wallet</div>
                <div className="value mono">{address ?? 'Not connected'}</div>
              </div>
              <div>
                <div className="label">State</div>
                <div className="value">
                  {!address ? 'Connect wallet' : !started ? 'Not started' : completed ? 'Completed' : 'In progress'}
                </div>
              </div>
              <div>
                <div className="label">Answered</div>
                <div className="value">{started ? `${countBits(answeredMask)}/4` : '0/4'}</div>
              </div>
              <div>
                <div className="label">Score (decrypted)</div>
                <div className="value">{score ?? '—'}</div>
              </div>
            </div>

            <div className="row">
              <button className="button primary" onClick={startGame} disabled={!address || !configured || started}>
                Start Game (100 points)
              </button>
              <div className="hint">
                Bonus: +100 if answers are all correct.
              </div>
            </div>

            {(zamaLoading || zamaError) && (
              <div className="hint">
                {zamaLoading ? 'Initializing encryption service…' : `Encryption service error: ${zamaError}`}
              </div>
            )}
            {pendingTx && <div className="hint">{pendingTx}</div>}
          </section>

          <section className="card">
            <h2 className="card-title">Quiz</h2>

            <div className="questions">
              {QUESTIONS.map((q) => {
                const answered = isAnswered(q.id);
                const current = selected[q.id] ?? 0;
                return (
                  <div key={q.id} className="question">
                    <div className="question-head">
                      <div>
                        <div className="question-title">{q.title}</div>
                        <div className="question-prompt">{q.prompt}</div>
                      </div>
                      <div className={`pill ${answered ? 'pill-done' : 'pill-open'}`}>
                        {answered ? 'Submitted' : 'Open'}
                      </div>
                    </div>

                    <div className="options">
                      {q.options.map((label, idx) => {
                        const optionIndex = idx + 1;
                        return (
                          <label key={idx} className={`option ${current === optionIndex ? 'option-selected' : ''}`}>
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              checked={current === optionIndex}
                              onChange={() => setSelected((prev) => ({ ...prev, [q.id]: optionIndex }))}
                              disabled={!address || !started || answered || completed}
                            />
                            <span className="option-index">{optionIndex}</span>
                            <span className="option-label">{label}</span>
                          </label>
                        );
                      })}
                    </div>

                    <div className="row">
                      <button
                        className="button"
                        onClick={() => submitAnswer(q.id)}
                        disabled={!address || !started || answered || completed || !!pendingTx}
                      >
                        Submit Encrypted Answer
                      </button>
                      <div className="hint">Your choice is encrypted client-side and verified on-chain without decryption.</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function countBits(n: number): number {
  let x = n >>> 0;
  let count = 0;
  while (x) {
    x &= x - 1;
    count++;
  }
  return count;
}

