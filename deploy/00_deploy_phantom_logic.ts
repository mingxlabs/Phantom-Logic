import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia") {
    if (!process.env.INFURA_API_KEY) throw new Error("Missing INFURA_API_KEY in environment/.env");
    if (!process.env.PRIVATE_KEY) throw new Error("Missing PRIVATE_KEY in environment/.env (do not use a mnemonic)");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployed = await deploy("PhantomLogic", {
    from: deployer,
    log: true,
  });

  console.log(`PhantomLogic contract: `, deployed.address);
};

export default func;
func.id = "deploy_phantomLogic";
func.tags = ["PhantomLogic"];
