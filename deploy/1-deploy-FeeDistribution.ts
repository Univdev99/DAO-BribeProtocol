import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import deployParameters from '../helper/constants';
import { ContractId } from '../helper/types';
import { getBidAssetDeployment } from "../helper/contracts";

const deployFeeDistribution: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const {
        deployments: { deploy, get },
        getNamedAccounts,
        getChainId,
    } = hre;

    const { deployer } = await getNamedAccounts();
    const currentDeployParameters = deployParameters[hre.network.name];

    const bidAsset  = await getBidAssetDeployment(
        currentDeployParameters.bidAsset
    )

    await deploy(ContractId.FeeDistribution, {
        from: deployer,
        log: true,
        args: [bidAsset.address]
    })
    
}

export default deployFeeDistribution;
deployFeeDistribution.tags = [ContractId.FeeDistribution];