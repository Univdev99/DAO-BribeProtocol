import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ContractId } from '../helper/types';

const deployAaveWrapperToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
        getChainId,
    } = hre
    const { deployer } = await getNamedAccounts()  

    await deploy(ContractId.AaveWrapperToken, {
      from: deployer,
      log: true,
      args: []
    })
}

export default deployAaveWrapperToken;
deployAaveWrapperToken.tags = [ContractId.AaveWrapperToken];