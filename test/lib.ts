import { expect } from "chai";
import { network, ethers, deployments } from "hardhat";
import { AbiItem } from "web3-utils";
import { BigNumber, Signer } from "ethers";
import { abi as aaveTokenV2Abi } from "@aave/governance-v2/artifacts/@aave/aave-token/contracts/token/AaveTokenV2.sol/AaveTokenV2.json";
import { abi as stkAaveTokenV2Abi } from "@aave/aave-stake/artifacts/contracts/stake/StakedAaveV2.sol/StakedAaveV2.json";
import { abi as strategyAbi } from "@aave/governance-v2/artifacts/contracts/governance/GovernanceStrategy.sol/GovernanceStrategy.json";
import { abi as executorAbi } from "@aave/governance-v2/artifacts/contracts/governance/Executor.sol/Executor.json";
import { abi as govAbi } from "@aave/governance-v2/artifacts/contracts/governance/AaveGovernanceV2.sol/AaveGovernanceV2.json";
import { abi as aavePoolAbi } from "../artifacts/contracts/AavePool.sol/AavePool.json";
import { bytes32, generateRandomBytes32 } from "./helpers";
import { ETH_SECOND_PER_BLOCK } from "./constants";
import { ContractId } from "../helper/types";
import { AavePool, BribeStakeHelper, BribeToken, Dividends, Erc20, FeeDistribution, MockAaveGovernanceWithTokens } from "../compiled-types";
import { getAaveDeployment, getAaveGovernance, getAavePoolDeployment, getBidAssetDeployment, getBribeStakeHelperDeployment, getBribeTokenDeployment, getDividendsDeployment, getFeeDistributionDeployment, getStkAaveDeployment } from "../helper/contracts";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";


export const proposalStates = {
  PENDING: 0,
  CANCELED: 1,
  ACTIVE: 2,
  FAILED: 3,
  SUCCEEDED: 4,
  QUEUED: 5,
  EXPIRED: 6,
  EXECUTED: 7,
};

export const rewardConfig = {
  rewardAmountDistributedPerSecond: 0,
  startTimestamp: 0,
  endTimestamp: 0
}
  
export const deployedContracts = {
  AaveTokenV2: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9",
  StkAaveTokenV2: "0x4da27a545c0c5b758a6ba100e3a049001de870f5",
  GovernanceStrategy: "0xb7e383ef9B1E9189Fc0F71fb30af8aa14377429e",
  AaveGovernanceV2: "0xEC568fffba86c094cf06b22134B23074DFE2252c",
  Executor: "0xEE56e2B3D491590B5b31738cC34d5232F378a8D5",
};

export interface ITestVars {
  aaveGovernance: MockAaveGovernanceWithTokens,
  // strategy: any,
  // executor: any,
  aaveTokenV2: Erc20,
  stkAave: Erc20,
  users: SignerWithAddress[],
  staker: SignerWithAddress,
  bribeToken: BribeToken,
  usdc: Erc20,
  aavePool: AavePool,
  proposal: any,
  proposalId: number,
  // startBlock: any,
  // endBlock: any,
  aaveWrapperToken: Erc20,
  stkAaveWrapperToken:Erc20,
  // aavePoolWithMockGovernance: AavePool,
  // mockAaveGovernance: MockAaveGovernance,
  feeDistribution: FeeDistribution,
  dividends: Dividends,
  bribeStakeHelper: BribeStakeHelper
  // mockAaveGovernanceWithTokens: MockAaveGovernanceWithTokens
}

export const setupTest = deployments.createFixture(async ({ ethers }): Promise<ITestVars> => {
    // const Erc20 = await ethers.getContractFactory("Erc20");
    // const provider = ethers.getDefaultProvider();    
    // const aaveGovernance = new ethers.Contract(
    //   deployedContracts.AaveGovernanceV2,
    //   govAbi,
    //   provider
    // );
    // const strategy = new ethers.Contract(
    //   deployedContracts.GovernanceStrategy,
    //   strategyAbi,
    //   provider
    // );
    // const executor = new ethers.Contract(
    //   deployedContracts.Executor,
    //   executorAbi,
    //   provider
    // );
    const signers = await ethers.getSigners();
    const users = signers.slice(0, 6);
    const staker = signers[4];

    const aaveGovernance = await getAaveGovernance();
    const bribeToken = await getBribeTokenDeployment();
    const usdc = await getBidAssetDeployment();
    const aaveTokenV2 = await getAaveDeployment();
    const stkAave =  await getStkAaveDeployment();
    const aavePool = await getAavePoolDeployment();
    const feeDistribution = await getFeeDistributionDeployment();
    const dividends = await getDividendsDeployment()
    const proposalId = 1;
    const proposal = await aaveGovernance.getProposalById(
      BigNumber.from(proposalId)
    );
    // create proposal id
    await aaveGovernance.createProposal(proposalId)

    // set receipt tokens
    await aaveGovernance.setReceiptTokens(
      await aavePool.wrapperAaveToken(),
      await aavePool.wrapperStkAaveToken()
    )

    const bribeStakeHelper = await getBribeStakeHelperDeployment();

    // const mockAaveGovernance = await MockAaveGovernance.deploy() as MockAaveGovernance
    // const aavePoolWithMockGovernance = await AavePool.deploy(
    //     bribeToken.address, // bribe token
    //     aaveTokenV2.address, // aave token
    //     stkAave.address, // stkAave token
    //     usdc.address, // bid asset
    //     3600, // 1 hour of delay
    //     mockAaveGovernance.address, // aave
    //     rewardConfig
    // ) as AavePool
  
    // const user = users[0];
    // const withAlice = usdc.connect(user);
  
    // await Promise.all([
    //   withAlice.mint(999),
    //   withAlice.approve(aavePool.address, 999),
    // ]);
  
    // const govContract = aaveGovernance.connect(user);
    // const proposalId = (await govContract.getProposalsCount()) - 1;
    // const proposal = await govContract.getProposalById(
    //   BigNumber.from(proposalId)
    // );
    // const votingDuration = await executor.VOTING_DURATION();
    const aaveWrapperToken = await ethers.getContractAt(
      ContractId.Erc20,
      await aavePool.wrapperAaveToken(),
      users[0]
    ) as Erc20
  
    const stkAaveWrapperToken = await ethers.getContractAt(
      ContractId.Erc20,
      await aavePool.wrapperStkAaveToken(),
      users[0]
    ) as Erc20
  
    return {
        aaveGovernance,
        // strategy,
        // executor,
        aaveTokenV2,
        stkAave,
        users,
        bribeToken,
        usdc,
        aavePool,
        staker,
        proposalId: 1,
        proposal,
        // proposal,
        // proposalId,
        // startBlock: proposal.startBlock,
        // endBlock: proposal.startBlock.add(votingDuration),
        aaveWrapperToken,
        stkAaveWrapperToken,
        feeDistribution,
        dividends,
        bribeStakeHelper,
        // aavePoolWithMockGovernance,
        // mockAaveGovernanceWithTokens
    };
});

export const latestTime = async () =>  (await ethers.provider.getBlock('latest')).timestamp

export async function increaseTime(duration: number) {
  await ethers.provider.send("evm_increaseTime", [duration]);
  await ethers.provider.send('evm_mine', [])
}

export const setUserAaveTokenBalance = async(testVars: ITestVars, accounts: Signer[], amount: number | BigNumber) => {
  await Promise.all(accounts.map(account => testVars.aaveTokenV2.connect(account).mint(amount)))
}
  
export const setUserStkAaveTokenBalance = async(testVars: ITestVars, accounts: Signer[], amount: number | BigNumber) => {
  await Promise.all(accounts.map(account => testVars.stkAave.connect(account).mint(amount)))
}