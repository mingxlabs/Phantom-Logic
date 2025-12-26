import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import fs from "node:fs";
import path from "node:path";

task("phantom:address", "Prints the PhantomLogic contract address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const deployment = await hre.deployments.get("PhantomLogic");
  console.log("PhantomLogic address is " + deployment.address);
});

task("phantom:start", "Starts the game for the first signer").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { ethers } = hre;
  const deployment = await hre.deployments.get("PhantomLogic");
  const signers = await ethers.getSigners();
  const contract = await ethers.getContractAt("PhantomLogic", deployment.address);
  const tx = await contract.connect(signers[0]).startGame();
  console.log(`Wait for tx:${tx.hash}...`);
  const receipt = await tx.wait();
  console.log(`tx:${tx.hash} status=${receipt?.status}`);
});

task("phantom:answer", "Submits an encrypted answer for the first signer")
  .addParam("question", "The question index [0..3]")
  .addParam("option", "The option index [1..4]")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const question = parseInt(taskArguments.question, 10);
    const option = parseInt(taskArguments.option, 10);
    if (!Number.isInteger(question) || question < 0 || question > 3) throw new Error("Invalid --question");
    if (!Number.isInteger(option) || option < 1 || option > 4) throw new Error("Invalid --option");

    const deployment = await hre.deployments.get("PhantomLogic");
    const signers = await ethers.getSigners();
    const contract = await ethers.getContractAt("PhantomLogic", deployment.address);

    const encrypted = await fhevm.createEncryptedInput(deployment.address, signers[0].address).add8(option).encrypt();
    const tx = await contract.connect(signers[0]).submitAnswer(question, encrypted.handles[0], encrypted.inputProof);
    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);
  });

task("phantom:state", "Prints the plaintext game state and decrypts the score (requires ACL)")
  .addOptionalParam("player", "Player address (defaults to first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, fhevm } = hre;
    await fhevm.initializeCLIApi();

    const deployment = await hre.deployments.get("PhantomLogic");
    const signers = await ethers.getSigners();
    const player: string = (taskArguments.player as string | undefined) ?? signers[0].address;
    const contract = await ethers.getContractAt("PhantomLogic", deployment.address);

    const state = await contract.getGameState(player);
    console.log(`started=${state[0]} completed=${state[1]} answeredMask=${state[2]}`);

    const encryptedScore = await contract.scoreOf(player);
    if (encryptedScore === ethers.ZeroHash) {
      console.log("encryptedScore=0x0 clearScore=0");
      return;
    }

    const clearScore = await fhevm.userDecryptEuint(FhevmType.euint32, encryptedScore, deployment.address, signers[0]);
    console.log(`encryptedScore=${encryptedScore} clearScore=${clearScore}`);
  });

task("phantom:sync-frontend", "Writes frontend/src/config/contracts.ts from deployments/sepolia")
  .addOptionalParam("out", "Output path", "frontend/src/config/contracts.ts")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    if (hre.network.name !== "sepolia") {
      throw new Error("This task only supports --network sepolia (frontend must not use localhost).");
    }

    const deployment = await hre.deployments.get("PhantomLogic");
    const outPath = path.resolve(process.cwd(), taskArguments.out as string);

    const content =
      `/* This file is auto-generated from hardhat-deploy deployments/sepolia. */\n` +
      `/* Run: npx hardhat --network sepolia phantom:sync-frontend */\n` +
      `\n` +
      `export const CONTRACT_CHAIN_ID = 11155111 as const;\n` +
      `export const CONTRACT_ADDRESS = '${deployment.address}' as const;\n` +
      `export const CONTRACT_ABI = ${JSON.stringify(deployment.abi, null, 2)} as const;\n`;

    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, content, "utf8");

    console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
  });
