import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ContractId } from '../helper/types';

const deployStkAaveWrapperToken: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
        getChainId,
    } = hre
    const { deployer } = await getNamedAccounts()  

    await deploy(ContractId.StkAaveWrapperToken, {
      from: deployer,
      log: true,
      args: []
    })
}

export default deployStkAaveWrapperToken;
deployStkAaveWrapperToken.tags = [ContractId.StkAaveWrapperToken];