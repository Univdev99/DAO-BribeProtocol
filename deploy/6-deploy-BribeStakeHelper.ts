import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import deployParameters from '../helper/constants';
import { ContractId } from '../helper/types';
import { getBidAssetDeployment } from "../helper/contracts";

const deployBribeStakeHelper: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
    } = hre;
    const { deployer } = await getNamedAccounts();
    const currentDeployParameters = deployParameters[hre.network.name]

    const bribeToken = await get(ContractId.BribeToken)
    const staking = await get(ContractId.Dividend)

    await deploy(ContractId.BribeStakeHelper, {
        from: deployer,
        log: true,
        args: [
            bribeToken.address,
            staking.address
        ]
    })
}

export default deployBribeStakeHelper;
deployBribeStakeHelper.tags = [ContractId.BribeStakeHelper];
