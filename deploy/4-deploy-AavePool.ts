import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import deployParameters from '../helper/constants';
import { ContractId } from '../helper/types';
import { getAaveDeployment, getAaveGovernance, getBidAssetDeployment, getStkAaveDeployment } from "../helper/contracts";

const deployAavePool: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {
    deployments: { deploy, get },
    getNamedAccounts,
  } = hre;

  const { deployer } = await getNamedAccounts();

  const bribeToken = await get(ContractId.BribeToken)
  const feeDistributor = await get(ContractId.FeeDistribution)
  const currentDeployParameters = deployParameters[hre.network.name]
  const bidAsset  = await getBidAssetDeployment(
    currentDeployParameters.bidAsset
  )
  const aave = await getAaveDeployment(
    currentDeployParameters.aave,
  )
  const stkAave = await getStkAaveDeployment(
    currentDeployParameters.stkAave
  )

  const aaveGovernance = await getAaveGovernance(
    currentDeployParameters.aaveGovernance,
  )
  
  // 3 days in seconds
  const withdrawDelayPeriod = 86400
  const aaveWrapperToken = await get(ContractId.AaveWrapperToken);
  const stkAaveWrapperToken = await get(ContractId.StkAaveWrapperToken)

  await deploy(ContractId.AavePool, {
    from: deployer,
    args: [
      bribeToken.address,
      aave.address,
      stkAave.address,
      bidAsset.address,
      withdrawDelayPeriod,
      aaveGovernance.address,
      feeDistributor.address,
      aaveWrapperToken.address,
      stkAaveWrapperToken.address,
      [0, 0, 0]
    ],
    log: true
  });

};

export default deployAavePool;
deployAavePool.tags = [ContractId.AavePool];
