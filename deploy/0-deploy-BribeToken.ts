import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import deployParameters from '../helper/constants';
import { ContractId } from '../helper/types';
import { BigNumber } from "ethers";

const deployBribeToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
        getChainId,
    } = hre
    const { deployer } = await getNamedAccounts()
    const name = "Bribe Token"
    const symbol = "BRIBE"
    // 100 million
    const supply = BigNumber.from(100_000_000).mul(BigNumber.from(10).pow(18))
  
    await deploy(ContractId.BribeToken, {
      from: deployer,
      log: true,
      args: [
        name,
        symbol,
        supply
      ]
    })
}

export default deployBribeToken;
deployBribeToken.tags = [ContractId.BribeToken];