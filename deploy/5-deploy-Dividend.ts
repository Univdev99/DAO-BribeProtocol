import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import deployParameters from '../helper/constants';
import { ContractId } from '../helper/types';
import { getBidAssetDeployment } from "../helper/contracts";

const deployDividend: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
    } = hre;
    const { deployer } = await getNamedAccounts();
    const currentDeployParameters = deployParameters[hre.network.name]

    const rewardAsset = await getBidAssetDeployment(
        currentDeployParameters.bidAsset
    )
    const stakeAsset = await get(ContractId.BribeToken)
    const feeDistributor = await get(ContractId.FeeDistribution)

    await deploy(ContractId.Dividend, {
        from: deployer,
        log: true,
        args: [
            rewardAsset.address,
            stakeAsset.address,
            feeDistributor.address
        ]
    })
}

export default deployDividend;
deployDividend.tags = [ContractId.Dividend];
