import { expect } from "chai";
import { network, ethers, deployments } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { bytes32, generateRandomBytes32 } from "./helpers";
import { ETH_SECOND_PER_BLOCK } from "./constants";
import { ContractId } from "../helper/types";
import { AavePool, Erc20, MockAaveGovernanceWithTokens } from "../compiled-types";
import { increaseTime, ITestVars, latestTime, setupTest, setUserAaveTokenBalance, setUserStkAaveTokenBalance} from "./lib";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const amountToDeposit = 10000
const amountToBid = 1000
const rewardConfig = {
  rewardAmountDistributedPerSecond: 0,
  startTimestamp: 0,
  endTimestamp: 0
}

async function userPoolDeposit(testVars: ITestVars, user: SignerWithAddress) {
  await setUserAaveTokenBalance(
    testVars,
    [user],
    amountToDeposit
  )

  await setUserStkAaveTokenBalance(
    testVars,
    [user],
    amountToDeposit
  )
  
  await testVars.aaveTokenV2.connect(user).approve(testVars.aavePool.address, amountToDeposit);
  await testVars.stkAave.connect(user).approve(testVars.aavePool.address, amountToDeposit);
  await testVars.aavePool.connect(user).deposit(
    testVars.aaveTokenV2.address,
    user.address,
    amountToDeposit,
    true
  )
  await testVars.aavePool.connect(user).deposit(
    testVars.stkAave.address,
    user.address,
    amountToDeposit,
    true
  )
}

async function userBid(
  testVars: ITestVars,
  user: SignerWithAddress,
  amountToBid: number,
  amountToMint ?: number,
  amountToApprove ?: number
) {
  await testVars.usdc.connect(user).mint(amountToMint || amountToBid * 5)
  await testVars.usdc.connect(user).approve(testVars.aavePool.address, amountToApprove || amountToBid * 5)
  await testVars.aavePool.connect(user).bid(testVars.proposalId, amountToBid, true);
}

describe("AavePool", function () {
  let testVars: ITestVars
  let aavePool: AavePool

  beforeEach(async function () {
    testVars = await setupTest()
    aavePool = testVars.aavePool
  });

  it("invalid constructor parameters", async function () {
    const AavePoolFactory = await ethers.getContractFactory(ContractId.AavePool);
    const rewardConfig = {
      rewardAmountDistributedPerSecond: 0,
      startTimestamp: 0,
      endTimestamp: 0
    }

    await expect(
      AavePoolFactory.deploy(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        0,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("BRIBE_TOKEN");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        testVars.usdc.address,
        0,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("AAVE_TOKEN");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        ethers.constants.AddressZero,
        testVars.usdc.address,
        604801,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("STKAAVE_TOKEN");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        testVars.usdc.address,
        3 * 86400,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("AAVE_GOVERNANCE");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        ethers.constants.AddressZero,
        3 * 86400,
        testVars.aaveGovernance.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("BID_ASSET");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        testVars.usdc.address,
        0,
        testVars.aaveGovernance.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("DELAY_PERIOD");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        testVars.usdc.address,
        86400 * 100000,
        testVars.aaveGovernance.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("E_DELAY_PERIOD");

    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        testVars.usdc.address,
        120,
        testVars.aaveGovernance.address,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("FEE_RECEIPIENT");


    await expect(
      AavePoolFactory.deploy(
        testVars.bribeToken.address,
        testVars.aaveTokenV2.address,
        testVars.stkAave.address,
        testVars.usdc.address,
        120,
        testVars.aaveGovernance.address,
        testVars.feeDistribution.address,
        ethers.constants.AddressZero, 
        ethers.constants.AddressZero,
        rewardConfig
      )
    ).to.revertedWith("AAVE_WRAPPER");
  });

  it("deposit - revert if deposit 0", async function () {
    await expect(
      testVars.aavePool
        .connect(testVars.staker)
        .deposit(testVars.aaveTokenV2.address, testVars.staker.address, 0, true)
    ).to.revertedWith("INVALID_AMOUNT");
  });

  it("deposit", async function () {
    const {
      aavePool,
      aaveTokenV2,
      stkAave,
      aaveWrapperToken,
      stkAaveWrapperToken,
      users: [bob, peter]
    } = testVars

    // set user
    await setUserAaveTokenBalance(
      testVars,
      [bob, peter],
      amountToDeposit
    );
    await setUserStkAaveTokenBalance(
      testVars,
      [bob, peter],
      amountToDeposit
    );
    
    await Promise.all([bob, peter].map(async (account) => {
      await aaveTokenV2.connect(account).approve(aavePool.address, amountToDeposit);
      await stkAave.connect(account).approve(aavePool.address, amountToDeposit);
      
      // aave deposit
      await expect(
        aavePool.connect(account).deposit(
          aaveTokenV2.address,
          account.address,
          amountToDeposit,
          true
        )
      ).to.emit(aavePool, "Deposit")
        .withArgs(
          aaveTokenV2.address,
          account.address,
          amountToDeposit,
          await latestTime()
        )
        
        // stk aave deposit
        await expect(
          aavePool.connect(account).deposit(
            stkAave.address,
            account.address,
            amountToDeposit,
            true
          )
        ).to.emit(aavePool, "Deposit")
          // .withArgs(
          //   stkAave.address,
          //   account.address,
          //   amountToDeposit,
          //   await latestTime()
          // )
    }))

    expect((await aaveWrapperToken.balanceOf(bob.address)).toNumber()).to.eq(amountToDeposit)
    expect((await aaveWrapperToken.balanceOf(peter.address)).toNumber()).to.eq(amountToDeposit)
    expect((await stkAaveWrapperToken.balanceOf(bob.address)).toNumber()).to.eq(amountToDeposit)
    expect((await stkAaveWrapperToken.balanceOf(peter.address)).toNumber()).to.eq(amountToDeposit)
  });

  it("withdraw", async () => {
    const {
      aavePool,
      aaveTokenV2,
      stkAave,
      aaveWrapperToken,
      stkAaveWrapperToken,
      users: [bob,]
    } = testVars

    // bob deposits in the pool
    await userPoolDeposit(testVars, bob)

    // cannot withdraw 0 amount
    await expect(
      aavePool
        .connect(bob)
        .withdraw(aaveTokenV2.address, bob.address, 0, true)
    ).to.revertedWith("INVALID_AMOUNT");

    // cannot withdraw more than deposited
    await expect(
      aavePool.connect(bob).withdraw(
        aaveTokenV2.address,
        bob.address,
        amountToDeposit * 3,
        true
      )
    ).to.revertedWith('INVALID_BALANCE')

    // successfully withdraws
    await expect(
      aavePool.connect(bob).withdraw(
        aaveTokenV2.address,
        bob.address,
        amountToDeposit,
        true
      )
    ).to.emit(aavePool, 'Withdraw')

    await expect(
      aavePool.connect(bob).withdraw(
        stkAave.address,
        bob.address,
        amountToDeposit,
        true
      )
    ).to.emit(aavePool, 'Withdraw')

    expect((await aaveWrapperToken.balanceOf(bob.address)).toNumber()).to.eq(0)
    expect((await stkAaveWrapperToken.balanceOf(bob.address)).toNumber()).to.eq(0)
    expect((await aaveTokenV2.balanceOf(bob.address)).toNumber()).to.eq(amountToDeposit)
  })

 
  it("Bid - succeeds", async function () {
    const {
      aavePool,
      usdc,
      proposalId,
      aaveGovernance,
      users: [bob,peter,paul]
    } = testVars

    // paul deposits in the pool
    await userPoolDeposit(testVars, paul)

    const withPeter = aavePool.connect(peter);

    // mint usdc
    await Promise.all([bob, peter].map(async (account) => {
      await usdc.connect(account).mint(amountToBid * 5)
      await usdc.connect(account).approve(aavePool.address, amountToBid * 5)
    }))

    await expect(withPeter.bid(proposalId, amountToBid, true))
      .to.emit(withPeter, "HighestBidIncreased")
      .withArgs(proposalId, ethers.constants.AddressZero, peter.address, amountToBid);

    // another bid by the same user should increase their bid amount
    await expect(withPeter.bid(proposalId, amountToBid * 2, true))
      .to.emit(aavePool, "HighestBidIncreased")
      .withArgs(proposalId, peter.address, peter.address, amountToBid * 3);

    await expect(aavePool.bid(proposalId, amountToBid * 4, true))
      .to.emit(aavePool, "HighestBidIncreased")
      .withArgs(proposalId, peter.address, bob.address, amountToBid * 4);    
  });

  it("revert if withdraw in active bid period", async function () {
    const {
      aavePool,
      aaveTokenV2,
      users: [bob, peter,]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)

    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await expect(
      aavePool
        .connect(peter)
        .withdraw(aaveTokenV2.address, peter.address, 10, true)
    ).to.revertedWith("ACTIVE_BID");

  });

  it("bid fails after end time", async function () {
    const {
      aavePool,
      proposalId,
      proposal,
      aaveGovernance,
      users: [bob,peter,paul]
    } = testVars
    
    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)
      
    const blockNumber = await network.provider.send("eth_blockNumber");
    const bidDuration = (proposal.endBlock - blockNumber) * ETH_SECOND_PER_BLOCK - 3600;

    await increaseTime(bidDuration - 30);

    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await increaseTime(bidDuration + 1000000);

    await expect(
      aavePool.connect(peter).bid(testVars.proposalId, amountToBid, true)
    ).to.be.revertedWith('BID_ENDED')

  });

  it("Vote: fails when it is before bid end time", async function () {
    const {
      aavePool,
      proposalId,
      users: [bob,peter]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)
    
    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await expect(aavePool.connect(bob).vote(proposalId)).to.revertedWith("BID_ACTIVE");
  });

  it("Vote: fails with invalid proposal id", async function () {
    const {
      aavePool,
      proposalId,
      users: [bob, peter]
    } = testVars

    await expect(aavePool.connect(bob).vote(generateRandomBytes32())).to.revertedWith(
      "INVALID_PROPOSAL"
    );
  });

  it("vote: succeeds", async function () {
    const {
      aavePool,
      proposalId,
      proposal,
      aaveGovernance,
      users: [bob,peter,paul]
    } = testVars
    
    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)
      
    const blockNumber = await network.provider.send("eth_blockNumber");
    const bidDuration = (proposal.endBlock - blockNumber) * ETH_SECOND_PER_BLOCK - 3600;

    await increaseTime(bidDuration - 30);

    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await increaseTime(bidDuration + 1000000);

    await expect(
      aavePool.connect(peter).vote(testVars.proposalId)
    ).to.emit(aavePool, 'Vote')
  })

  it("revert if withdraw before delay", async function () {
    const {
      aavePool,
      aaveTokenV2,
      proposalId,
      aaveGovernance,
      users: [bob,peter,paul]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)

    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    // @TODO increase time
    // and vote
    /// so we can trigger delay period

    // await expect(
    //   aavePool
    //     .connect(peter)
    //     .withdraw(aaveTokenV2.address, peter.address, 10)
    // ).to.revertedWith("ACTIVE_DELAY_PERIOD");
  });

  it("revert if set invalid delay period", async function () {
    const {
      aavePool,
      aaveTokenV2,
      proposalId,
      aaveGovernance,
      users: [bob,peter,paul]
    } = testVars
    const period = await aavePool.withdrawalDelayPeriodInSeconds();

    await expect(aavePool.setDelayPeriod(0)).to.revertedWith(
      "INVALID_PERIOD"
    );

    await expect(aavePool.setDelayPeriod(period)).to.revertedWith(
      "SAME_PERIOD"
    );

    await expect(aavePool.setDelayPeriod(604801)).to.revertedWith(
      "EXCEEDS_MAX"
    );
  });

  it("should set delay period properly", async function () {
    const {
      aavePool,
      users: [bob,peter,paul]
    } = testVars
    const period = await aavePool.withdrawalDelayPeriodInSeconds();
    
    await expect(aavePool.setDelayPeriod(period.add(1)))
      .to.emit(aavePool, "UpdateDelayPeriod")
      // .withArgs(period.add(1), await time.latest());
    
    expect(await aavePool.withdrawalDelayPeriodInSeconds()).to.equal(
      period.add(1)
    );
  });

  it("setStartTimestamp", async function () {
    const {
      aavePool,
      users: [bob,peter,paul]
    } = testVars
    const latestTimes = await latestTime() + 100

    await expect(aavePool.setStartTimestamp(latestTimes, 1))
      .to.emit(aavePool, "SetBribeRewardStartTimestamp")
      // .withArgs(period.add(1), await );

    await expect(aavePool.setStartTimestamp(latestTimes - 500, 1))
      .to.be.revertedWith("INVALID_START_TIMESTAMP")    
    
    expect((await aavePool.bribeRewardConfig()).startTimestamp).to.equal(
      latestTimes
    );
  });

  it("setEndTimestamp", async function () {
    const {
      aavePool,
      users: [bob,peter,paul]
    } = testVars
    const latestTimes = await latestTime() + 1000

    await expect(aavePool.setEndTimestamp(latestTimes))
      .to.emit(aavePool, "SetBribeRewardEndTimestamp")
      // .withArgs(period.add(1), await time.latest());

    await expect(aavePool.setEndTimestamp(await latestTime() - 500))
      .to.be.revertedWith("INVALID_END_TIMESTAMP")
    
    await expect(aavePool.setStartTimestamp(latestTimes, 10)).to.be.revertedWith('HIGH_TIMESTAMP')
    
    expect((await aavePool.bribeRewardConfig()).endTimestamp).to.equal(
      latestTimes
    );
  });

  it('setFeeDistributor', async function() {
    const { aavePool } = testVars
    const [,user2,] = testVars.users

    await expect(
      aavePool.connect(user2).setFeeRecipient(user2.address)
    ).to.be.revertedWith('Ownable: caller is not the owner')

    await expect(
      aavePool.setFeeRecipient(ethers.constants.AddressZero)
    ).to.be.revertedWith('INVALID_RECIPIENT')

    await expect(
      aavePool.setFeeRecipient(user2.address)
    ).to.emit(aavePool, 'UpdateFeeRecipient')
        .withArgs(aavePool.address, user2.address)
  })

  it("setRewardPerSecond", async function () {
    const {
      aavePool,
      users: [bob,peter,paul]
    } = testVars

    await expect(aavePool.setRewardPerSecond(10))
      .to.emit(aavePool, "SetBribeRewardPerSecond")
      // .withArgs(period.add(1), await time.latest());

    expect((await aavePool.bribeRewardConfig()).rewardAmountDistributedPerSecond).to.equal(
      10
    );
  });

  it("refund: revert if refund active proposal", async function () {
    const {
      aavePool,
      proposalId,
      users: [bob,peter]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)
    
    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await expect(
      aavePool.connect(bob).refund(proposalId)
    ).to.revertedWith("PROPOSAL_ACTIVE");

  });

  it("refund: not working for no bid", async function () {
    const {
      aavePool,
      aaveGovernance,
      proposalId,
      users: [bob,peter]
    } = testVars

    await aaveGovernance.cancel(proposalId);
    await expect(
      aavePool.connect(bob).refund(proposalId)
    ).to.not.emit(aavePool, 'Refund');
  });

  it("refund: success cancelled proposal", async function () {
    const {
      aavePool,
      proposalId,
      aaveGovernance,
      usdc,
      users: [bob,peter]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)
    
    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    await aaveGovernance.cancel(proposalId);

    await expect(
      aavePool.connect(peter).bid(proposalId, 50, true)
    ).to.revertedWith("INVALID_PROPOSAL_STATE");

    const prevBalance = await usdc.balanceOf(peter.address);

    await expect(aavePool.connect(peter).refund(proposalId))
      .to.emit(aavePool, "Refund")
      .withArgs(proposalId, peter.address, amountToBid);
    
    expect(await usdc.balanceOf(peter.address)).to.equal(
      prevBalance.add(amountToBid)
    );
  });
  
  it("blockProposalId", async function () {
    const {
      aavePool,
      proposalId,
      aaveGovernance,
      usdc,
      users: [bob,peter]
    } = testVars

    // peter deposits in the pool
    await userPoolDeposit(testVars, peter)

    // peter bids on a proposal
    await userBid(testVars, peter, amountToBid)

    const prevBalance = await usdc.balanceOf(peter.address);

    await expect(aavePool.blockProposalId(proposalId))
      .to.emit(aavePool, "BlockProposalId")
      // .withArgs(this.proposalId, currentTime);

    await expect(
      aavePool.blockProposalId(proposalId)
    ).to.revertedWith("PROPOSAL_INACTIVE");

    expect(await usdc.balanceOf(peter.address)).to.equal(
      prevBalance.add(amountToBid)
    );

    await expect(
      aavePool.connect(peter).bid(proposalId, 10, true)
    ).to.revertedWith("PROPOSAL_BLOCKED");

  });

  it("unblockProposalId", async function () {
    const {
      aavePool,
      proposalId,
      aaveGovernance,
      usdc,
      users: [bob,peter]
    } = testVars

    const currentTime = await latestTime();

    await aavePool.blockProposalId(proposalId);

    await expect(aavePool.unblockProposalId(proposalId))
      .to.emit(aavePool, "UnblockProposalId")
      // .withArgs(this.proposalId, currentTime);
 
    await expect(
      aavePool.unblockProposalId(proposalId)
    ).to.revertedWith("PROPOSAL_ACTIVE");

    await userPoolDeposit(testVars, peter)

    await userBid(testVars, peter, amountToBid)
  });

  it("multicall", async function() {
    const {
      aavePool,
      proposalId,
      aaveTokenV2,
      stkAave,
      aaveGovernance,
      usdc,
      users: [bob, peter, paul]
    } = testVars

    await setUserAaveTokenBalance(
      testVars,
      [bob],
      amountToDeposit
    )
  
    await setUserStkAaveTokenBalance(
      testVars,
      [bob],
      amountToDeposit
    )
    
    await testVars.aaveTokenV2.connect(bob).approve(testVars.aavePool.address, amountToDeposit);
    await testVars.stkAave.connect(bob).approve(testVars.aavePool.address, amountToDeposit);
    await testVars.usdc.connect(bob).mint(amountToBid)
    await testVars.usdc.connect(bob).approve(testVars.aavePool.address, amountToBid * 5)

    await aavePool.connect(bob).multicall([
      aavePool.interface.encodeFunctionData('deposit', [
        aaveTokenV2.address, bob.address, 10, true
      ]),
      aavePool.interface.encodeFunctionData(
        'deposit', [stkAave.address, bob.address, 10, true]
      ),
      aavePool.interface.encodeFunctionData('bid', [proposalId, 10, true]),
    ]);

    expect(await (await aavePool.bids(proposalId)).highestBid.toNumber()).to.equal(10);
    expect(await (await aavePool.bids(proposalId)).highestBidder).to.equal(
      bob.address
    );
    expect(await aaveTokenV2.balanceOf(aavePool.address)).to.equal(10);
    expect(await usdc.balanceOf(aavePool.address)).to.equal(10);
  })

  it('pause', async function() {
    const {
      aavePool,
      aaveTokenV2,
      proposalId,
      users: [bob, peter, paul]
    } = testVars

    await expect(
      aavePool.connect(peter).pause()
    ).to.be.revertedWith('Ownable: caller is not the owner')

    await expect(
      aavePool.pause()
    ).to.emit(aavePool, 'Paused')
      .withArgs(bob.address)

    await expect(
      aavePool.deposit(aaveTokenV2.address, bob.address, 1, true)
    ).to.be.revertedWith('Pausable: paused')

    await expect(
      aavePool.claimReward(aaveTokenV2.address, bob.address, ethers.constants.HashZero, true)
    ).to.be.revertedWith('Pausable: paused')

    await expect(
      aavePool.bid(proposalId, 1, true)
    ).to.be.revertedWith('Pausable: paused')
  })

  it('unpause', async function() {
    const {
      aavePool,
      users: [bob, peter, paul]
    } = testVars

    await expect(
      aavePool.connect(peter).unpause()
    ).to.be.revertedWith('Ownable: caller is not the owner')

    await aavePool.pause()

    await expect(
      aavePool.unpause()
    ).to.emit(aavePool, 'Unpaused')
      .withArgs(bob.address)
  })

});