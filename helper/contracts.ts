import {
    ethers,
    deployments,
    getUnnamedAccounts,
    getNamedAccounts,
    network,
} from 'hardhat'
import { Signer, Contract, BigNumber } from "ethers"
import { ContractId, EthereumAddress } from './types'
import { AavePool, BribeStakeHelper, BribeToken, Dividends, Erc20, FeeDistribution, MockAaveGovernanceWithTokens, MockFeeDistributor, MockPool } from "../compiled-types";


export const deployContract = async<ContractType extends Contract>(
    contractName: string,
    args: any[],
    libraries?: {}
) => {
    const contract = (await (await ethers.getContractFactory(contractName, {
        libraries: {
            ...libraries
        }
    })).deploy(
        ...args
      )) as ContractType;

      return contract
}

export const getBidAssetDeployment = async (address?: EthereumAddress) : Promise<Erc20> => {
    if (address == undefined && !await deployments.getOrNull(ContractId.BidAsset)) {
        await deployBidAsset()
    }

    return (await ethers.getContractAt(
        ContractId.BidAsset,
        address || (await deployments.get(ContractId.BidAsset)).address
    )) as Erc20
}

export const getAaveDeployment = async (address?: EthereumAddress) : Promise<Erc20> => {
    if (address == undefined && !await deployments.getOrNull(ContractId.Aave)) {
        await deployMockAave()
    }

    return (await ethers.getContractAt(
        ContractId.Aave,
        address || (await deployments.get(ContractId.Aave)).address
    )) as Erc20
}

export const getStkAaveDeployment = async (address?: EthereumAddress) : Promise<Erc20> => {
    if (address == undefined && !await deployments.getOrNull(ContractId.StkAave)) {
       await deployMockStkAave()
    }

    return (await ethers.getContractAt(
        ContractId.StkAave,
        address || (await deployments.get(ContractId.StkAave)).address
    )) as Erc20
}

export const getAaveGovernance = async(address?: EthereumAddress): Promise<MockAaveGovernanceWithTokens> => {
    if (address == undefined && !await deployments.getOrNull(ContractId.MockAaveGovernanceWithTokens)) {
        console.log('deploying mock aave governance')
        await deployMockAaveGovernanceWithTokens()
    }

    return (await ethers.getContractAt(
        ContractId.MockAaveGovernanceWithTokens,
        address || (await deployments.get(ContractId.MockAaveGovernanceWithTokens)).address
    )) as MockAaveGovernanceWithTokens
}

export const getBribeTokenDeployment = async(address ?: EthereumAddress): Promise<BribeToken> => {
    return (await ethers.getContractAt(
        ContractId.BribeToken,
        address || (await deployments.get(ContractId.BribeToken)).address
    )) as BribeToken
}

export const getAavePoolDeployment = async (address ?: EthereumAddress): Promise<AavePool> => {
    return (await ethers.getContractAt(
        ContractId.AavePool,
        address || (await deployments.get(ContractId.AavePool)).address
    )) as AavePool
}

export const getFeeDistributionDeployment = async (address ?: EthereumAddress): Promise<FeeDistribution> => {
    return (await ethers.getContractAt(
        ContractId.FeeDistribution,
        address || (await deployments.get(ContractId.FeeDistribution)).address
    )) as FeeDistribution
}

export const getDividendsDeployment = async (address ?: EthereumAddress): Promise<Dividends> => {
    return (await ethers.getContractAt(
        ContractId.Dividend,
        address || (await deployments.get(ContractId.Dividend)).address
    )) as Dividends
}

export const getBribeStakeHelperDeployment = async( address?: EthereumAddress) : Promise<BribeStakeHelper> => {
    return (await ethers.getContractAt(
        ContractId.BribeStakeHelper,
        address || (await deployments.get(ContractId.BribeStakeHelper)).address
    )) as BribeStakeHelper
}

export const deployBidAsset = async(): Promise<string> => {
    const { deployer } = await getNamedAccounts();
    const deploy = await deployments.deploy(ContractId.BidAsset, {
        from: deployer,
        args: [],
        log: true
    })
    return deploy.address
}

export const deployMockAave = async(): Promise<string> => {
    const { deployer } = await getNamedAccounts();
    const deploy = await deployments.deploy(ContractId.Aave, {
        from: deployer,
        args: [],
        log: true
    })
    return deploy.address
}

export const deployMockStkAave = async(): Promise<string> => {
    const { deployer } = await getNamedAccounts();
    const deploy = await deployments.deploy(ContractId.StkAave, {
        from: deployer,
        args: [],
        log: true
    })
    return deploy.address
}

export const deployMockAaveGovernanceWithTokens = async(): Promise<string> => {
    const { deployer } = await getNamedAccounts();
    const deploy = await deployments.deploy(ContractId.MockAaveGovernanceWithTokens, {
        from: deployer,
        args: [],
        log: true
    })
    return deploy.address
}

export const deployMockPool = async(asset: EthereumAddress, transfer: boolean): Promise<MockPool> => {
    return await deployContract<MockPool>(ContractId.MockPool, [asset, transfer])
}

export const deployMockFeeDistributor = async(asset: EthereumAddress, transfer: boolean): Promise<MockFeeDistributor> => {
    return await deployContract<MockFeeDistributor>(ContractId.MockFeeDistributor, [asset, transfer])
}
