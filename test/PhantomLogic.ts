import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { PhantomLogic, PhantomLogic__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("PhantomLogic")) as PhantomLogic__factory;
  const contract = (await factory.deploy()) as PhantomLogic;
  const address = await contract.getAddress();
  return { contract, address };
}

describe("PhantomLogic", function () {
  let signers: Signers;
  let contract: PhantomLogic;
  let contractAddress: string;

  before(async function () {
    const ethSigners = await ethers.getSigners();
    signers = { alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ contract, address: contractAddress } = await deployFixture());
  });

  it("starts with uninitialized score", async function () {
    const state = await contract.getGameState(signers.alice.address);
    expect(state.started).to.eq(false);
    expect(state.completed).to.eq(false);
    expect(state.answeredMask).to.eq(0);

    const encryptedScore = await contract.scoreOf(signers.alice.address);
    expect(encryptedScore).to.eq(ethers.ZeroHash);
  });

  it("gives 100 points on start", async function () {
    const tx = await contract.connect(signers.alice).startGame();
    await tx.wait();

    const encryptedScore = await contract.scoreOf(signers.alice.address);
    expect(encryptedScore).to.not.eq(ethers.ZeroHash);

    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    expect(clearScore).to.eq(100);
  });

  it("adds 100 bonus when answers are 1,1,2,2", async function () {
    await (await contract.connect(signers.alice).startGame()).wait();

    const answers = [1, 1, 2, 2] as const;
    for (let i = 0; i < answers.length; i++) {
      const encrypted = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(answers[i]).encrypt();
      await (await contract.connect(signers.alice).submitAnswer(i, encrypted.handles[0], encrypted.inputProof)).wait();
    }

    const state = await contract.getGameState(signers.alice.address);
    expect(state.started).to.eq(true);
    expect(state.completed).to.eq(true);
    expect(state.answeredMask).to.eq(0x0f);

    const encryptedScore = await contract.scoreOf(signers.alice.address);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    expect(clearScore).to.eq(200);
  });

  it("does not add bonus when any answer is wrong", async function () {
    await (await contract.connect(signers.alice).startGame()).wait();

    const answers = [1, 1, 2, 3] as const;
    for (let i = 0; i < answers.length; i++) {
      const encrypted = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(answers[i]).encrypt();
      await (await contract.connect(signers.alice).submitAnswer(i, encrypted.handles[0], encrypted.inputProof)).wait();
    }

    const encryptedScore = await contract.scoreOf(signers.alice.address);
    const clearScore = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedScore,
      contractAddress,
      signers.alice,
    );
    expect(clearScore).to.eq(100);
  });

  it("keeps player states isolated", async function () {
    await (await contract.connect(signers.alice).startGame()).wait();
    await (await contract.connect(signers.bob).startGame()).wait();

    const encrypted = await fhevm.createEncryptedInput(contractAddress, signers.alice.address).add8(1).encrypt();
    await (await contract.connect(signers.alice).submitAnswer(0, encrypted.handles[0], encrypted.inputProof)).wait();

    const aliceState = await contract.getGameState(signers.alice.address);
    const bobState = await contract.getGameState(signers.bob.address);
    expect(aliceState.answeredMask).to.eq(0x01);
    expect(bobState.answeredMask).to.eq(0x00);
  });
});

