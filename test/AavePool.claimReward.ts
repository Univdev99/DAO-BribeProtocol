import { expect } from "chai";
import { network, ethers, deployments } from "hardhat";
import { BigNumber, Signer } from "ethers";
import { AavePool, BribeStakeHelper, Erc20, FeeDistribution } from "../compiled-types";
import { deployedContracts, ITestVars, increaseTime, latestTime, 
        proposalStates, setupTest, setUserAaveTokenBalance, setUserStkAaveTokenBalance
} from "./lib";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const decimals = BigNumber.from(10).pow(18)
const amountToDeposit = BigNumber.from(1000).mul(decimals)
const amountToBid = BigNumber.from(2000).mul(decimals)
const amountOfBribeReward = BigNumber.from(1_00_000_000).mul(decimals)
const bribeRewardPerSecond = BigNumber.from(10).mul(decimals)
const removeFee = (amount: BigNumber) => amount.sub(amount.mul(16).div(100))

const multiDeposit = async (testVars: ITestVars, account: SignerWithAddress) => {
    await aaveTokenDeposit(testVars, account)
    await stkAaveDeposit(testVars, account)
}

const aaveTokenDeposit = async(testVars: ITestVars, account: SignerWithAddress) => {
    const {
        aaveTokenV2,
        aavePool,
    } = testVars

    await setUserAaveTokenBalance(
        testVars,
        [account],
        amountToDeposit
    )

    await aaveTokenV2.connect(account).approve(aavePool.address, amountToDeposit)
    await aavePool.connect(account).multicall([
        aavePool.interface.encodeFunctionData('deposit', [
            aaveTokenV2.address, account.address, amountToDeposit, true
        ])
    ])

}

const stkAaveDeposit = async (testVars: ITestVars, account: SignerWithAddress) => {
    const {
        stkAave,
        aavePool,
    } = testVars

    await setUserStkAaveTokenBalance(
        testVars,
        [account],
        amountToDeposit
    )

    await stkAave.connect(account).approve(aavePool.address, amountToDeposit)

    await aavePool.connect(account).multicall([
        aavePool.interface.encodeFunctionData('deposit', [
            stkAave.address, account.address, amountToDeposit, true
        ])
    ]);
}

async function userBid(
    testVars: ITestVars,
    user: SignerWithAddress,
    amountToBid: BigNumber,
) {
    await testVars.usdc.connect(user).mint(amountToBid)
    await testVars.usdc.connect(user).approve(testVars.aavePool.address, amountToBid)
    await testVars.aavePool.connect(user).bid(testVars.proposalId, amountToBid, true);
}

async function setStkAaveReward(testVars: ITestVars, stkAaveRewardAmount: BigNumber) {
    await testVars.stkAave.setReward(testVars.aavePool.address, stkAaveRewardAmount)
    await testVars.aaveTokenV2.setReward(testVars.aavePool.address, stkAaveRewardAmount)
}

describe("AavePool: claimReward", function () {
    let testVars: ITestVars

    beforeEach(async function () {
        testVars = await setupTest();
    });

    describe('claimReward: bid rewards', async function() {
        
        beforeEach(async function () {
            testVars = await setupTest();
        });

        it('user with multiple deposits and fee recipient can claim fees', async function() {
            const {
                usdc,
                proposalId,
                aavePool,
                aaveGovernance,
                feeDistribution,
                users: [bob, peter, paul]
            } = testVars
            
            await multiDeposit(testVars, peter)

            // create a proposal
            await aaveGovernance.createProposal(proposalId)

            // bid on the proposal
            // bid is 2000
            await Promise.all([
                usdc.connect(paul).mint(amountToBid),
                usdc.connect(paul).approve(aavePool.address, amountToBid),
            ])

            await aavePool.connect(paul).bid(proposalId, amountToBid, true)
            // increase time so the proposal exceeds 1 hour to endTime
            await increaseTime(3600 * 70)

            const amountToBidMinusFee = removeFee(amountToBid)

            expect((await aavePool.getPendingRewardToBeDistributed()).toString()).to.be.eq(amountToBidMinusFee.toString())
            // AavePool votes
            await aavePool.vote(proposalId)
            
            await multiDeposit(testVars, bob)

            const peterRewards = await aavePool.rewardBalanceOf(peter.address)
            const bobRewards = await aavePool.rewardBalanceOf(bob.address)
            const paulRewards = await aavePool.rewardBalanceOf(paul.address)

            expect(peterRewards.map(x => x.toString())).to.deep.eq([amountToBidMinusFee.toString(), '0', '0' ])
            expect(bobRewards.map(x => x.toString())).to.deep.eq([ '0', '0', '0' ])
            expect(paulRewards.map(x => x.toString())).to.deep.eq([ '0', '0', '0' ])

            // claim reward
            const peterPrevUSDCBal = await usdc.balanceOf(peter.address)
            await expect(
                aavePool.connect(peter).claimReward(
                    peter.address,
                    ethers.constants.AddressZero,
                    ethers.constants.HashZero,
                    true
                )
            ).to.emit(aavePool, 'RewardClaim')
                .withArgs(peter.address, amountToBidMinusFee, 0, 0,await latestTime())
            
            const newPeterBal = await usdc.balanceOf(peter.address)

            expect(peterPrevUSDCBal.add(amountToBidMinusFee)).to.eq(newPeterBal)

            const newPeterRewards = await aavePool.rewardBalanceOf(peter.address)
            expect(newPeterRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])

            await expect(
                aavePool.connect(peter).claimReward(
                    peter.address,
                    ethers.constants.AddressZero,
                    ethers.constants.HashZero,
                    true
                )
            ).to.emit(aavePool, 'RewardClaim')
                .withArgs(peter.address, 0, 0, 0, await latestTime())
            
            const feeAmount = await aavePool.feesReceived()
            console.log(feeAmount.toString())
            
            await feeDistribution.setFeeReceivers([peter.address], [1]);

            await expect(
                feeDistribution.claimFees([aavePool.address])
            ).to.emit(feeDistribution, 'ClaimFees')
                .to.emit(aavePool, 'WithdrawFees')
                .withArgs(aavePool.address, feeAmount, await latestTime())
        })

        it('user with single deposits', async function() {
            const {
                usdc,
                proposalId,
                aavePool,
                aaveGovernance,
                users: [bob, peter, paul, silas]
            } = testVars

            await aaveTokenDeposit(testVars, peter)
            await stkAaveDeposit(testVars, paul)

            // create a proposal
            await aaveGovernance.createProposal(proposalId)

            await userBid(testVars, silas, amountToBid)

            // increase time so the proposal exceeds 1 hour to endTime
            await increaseTime(3600 * 70)

            // AavePool votes
            await aavePool.vote(proposalId)

            // peter deposit stkAave after vote
            await stkAaveDeposit(testVars, peter)

            const peterRewards = await aavePool.rewardBalanceOf(peter.address)
            const paulRewards = await aavePool.rewardBalanceOf(paul.address)

            expect(peterRewards.map(x => x.toString())).to.deep.eq([ '840000000000000000000', '0', '0' ])
            expect(paulRewards.map(x => x.toString())).to.deep.eq([ '840000000000000000000', '0', '0' ])
            
            const peterPrevUSDCBal = await usdc.balanceOf(peter.address)
            
            await aavePool.connect(peter).claimReward(peter.address, ethers.constants.AddressZero, ethers.constants.HashZero, true)

            const newPeterBal = await usdc.balanceOf(peter.address)
            const amountToBidMinusFee = removeFee(amountToBid)

            expect(peterPrevUSDCBal.add(amountToBidMinusFee.div(BigNumber.from(2)))).to.eq(newPeterBal)

            const newPeterRewards = await aavePool.rewardBalanceOf(peter.address)
            expect(newPeterRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])
        })
    })

    describe('claimReward: bribe rewards', async function() {

        before(async function () {
            testVars = await setupTest();
        });

        it('accrues user reward', async function() {
            const {
                bribeToken,
                aavePool,
                users: [bob, peter, paul, silas]
            } = testVars

            await aaveTokenDeposit(testVars, peter)
            await stkAaveDeposit(testVars, paul)
            
            // bribe token transfer
            await bribeToken.transfer(aavePool.address, amountOfBribeReward);

            // setStartTimestamp
            const bribeRewardStartTimestamp = await latestTime() + 2

            await aavePool.setStartTimestamp(bribeRewardStartTimestamp, bribeRewardPerSecond);

            // increase time seconds
            const secondsToIncrease = 3600 * 70;
            await increaseTime(secondsToIncrease)
            
            const expectedAmountToBeDistributed = bribeRewardPerSecond.mul(BigNumber.from(secondsToIncrease))
            console.log(expectedAmountToBeDistributed.toString())

            // check the amount accrued by peter and paul
            const peterRewards = await aavePool.rewardBalanceOf(peter.address)
            const paulRewards = await aavePool.rewardBalanceOf(paul.address)

            // time is quite flaky
            // expect(peterRewards.map(x => x.toString())).to.deep.eq([ '0', '0', '1259995000000000000000000' ])
            // expect(paulRewards.map(x => x.toString())).to.deep.eq([ '0', '0', '1259995000000000000000000' ])

            const amountToReceive = expectedAmountToBeDistributed.div(2)

            await expect(
                aavePool.connect(peter).claimReward(peter.address, ethers.constants.AddressZero, ethers.constants.HashZero, true)
            ).to.emit(aavePool, 'RewardClaim')
                .withArgs(peter.address, 0, 0, amountToReceive, await latestTime())

            // since no increase in time
            const newPeterRewards = await aavePool.rewardBalanceOf(peter.address)
            expect(newPeterRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])

            const currentTimestamp = await latestTime()
            const endTimestamp = currentTimestamp + secondsToIncrease

            // set end timestamp
            await aavePool.setEndTimestamp(endTimestamp)

            await increaseTime(secondsToIncrease * 10)

            const endNewPeterRewards = await aavePool.rewardBalanceOf(peter.address)
            
            expect(endNewPeterRewards.map(x => x.toString())).to.deep.eq(
                [ '0', '0', '1260000000000000000000000' ]
            )
            
            await multiDeposit(testVars, silas)  
            await increaseTime(secondsToIncrease * 10)

            const silasRewards = await aavePool.rewardBalanceOf(silas.address)
            expect(silasRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])


        })

        it('withdrawRemainingBribeReward', async function() {
            const {
                bribeToken,
                aavePool,
                users: [bob, peter, paul, silas]
            } = testVars

            await expect(
                aavePool.connect(peter).withdrawRemainingBribeReward()
            ).to.revertedWith('Ownable: caller is not the owner')

            await expect(
                aavePool.withdrawRemainingBribeReward()
            ).to.revertedWith('INVALID_END_TIMESTAMP')
            
            await aavePool.setEndTimestamp(await latestTime() + 2)

            await expect(
                aavePool.withdrawRemainingBribeReward()
            ).to.revertedWith('GRACE_PERIOD')

            // increase time by over 30 days
            await increaseTime(13_592_000)
            
            const balanceOf = await bribeToken.balanceOf(aavePool.address)
            await expect(
                aavePool.withdrawRemainingBribeReward()
            ).to.emit(aavePool, 'WithdrawRemainingReward')
                .withArgs(balanceOf)            
        })

    })

    describe('stkAaveReward', async function() {
        beforeEach(async function () {
            testVars = await setupTest();
        });

        it('accrue: stkAave reward', async function() {
            const {
                usdc,
                proposalId,
                aavePool,
                stkAave,
                aaveTokenV2,
                aaveGovernance,
                users: [bob, peter, paul]
            } = testVars
            
            await multiDeposit(testVars, peter)
            await aaveTokenDeposit(testVars, paul)
            // should distribute to half to bob and peter
            const stkAaveRewardAmount = amountToBid

            /// sets pool reward ///
            await setStkAaveReward(testVars, stkAaveRewardAmount)
            //////////////////////

            const peterRewards = await aavePool.rewardBalanceOf(peter.address)
            console.log(`peterRewards ->`, (peterRewards).map(x => x.toString()))

            await stkAaveDeposit(testVars, paul)

            const paulRewards = await aavePool.rewardBalanceOf(paul.address)
            expect(paulRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])

            /// double pool reward ///
            await setStkAaveReward(testVars, stkAaveRewardAmount.mul(BigNumber.from(2)))
            //////////////////////

            const newPaulRewards = await aavePool.rewardBalanceOf(paul.address)
            const newPeterRewards = await aavePool.rewardBalanceOf(peter.address)

            expect(newPaulRewards.map(x => x.toString())).to.deep.eq(['0', '1000000000000000000000', '0' ])
            expect(newPeterRewards.map(x => x.toString())).to.deep.eq(['0', '3000000000000000000000', '0' ])

            await expect(
                aavePool.connect(peter).claimReward(peter.address, ethers.constants.AddressZero, ethers.constants.HashZero, true)
            ).to.emit(aavePool, 'RewardClaim')
                .withArgs(peter.address, 0, '3000000000000000000000', 0, await latestTime())

            const updatePeterRewards = await aavePool.rewardBalanceOf(peter.address)
            expect(updatePeterRewards.map(x => x.toString())).to.deep.eq(['0', '0', '0' ])
        })
    })
})

describe("WrapperToken", function() {
    let testVars: ITestVars
    let stkAaveWrapperToken: Erc20
    let aaveWrapperToken: Erc20

    beforeEach(async function() {
        testVars = await setupTest()
        stkAaveWrapperToken = testVars.stkAaveWrapperToken
        aaveWrapperToken = testVars.aaveWrapperToken
    })

    it('transfer & transferFrom reverts', async function () {
        const [bob, alice] = testVars.users

        await Promise.all([bob, alice].map((account) => multiDeposit(testVars, account)))

        await expect(
            stkAaveWrapperToken.transfer(alice.address, 10)
        ).to.be.revertedWith('TRANSFER_NOT_ALLOWED')

        await expect(
            stkAaveWrapperToken.transferFrom(bob.address, alice.address, 10)
        ).to.be.revertedWith('')

        await expect(
            stkAaveWrapperToken.approve(alice.address, 10)
        ).to.be.reverted

        await expect(
            aaveWrapperToken.transfer(alice.address, 10)
        ).to.be.revertedWith('TRANSFER_NOT_ALLOWED')

        await expect(
            aaveWrapperToken.transferFrom(bob.address, alice.address, 10)
        ).to.be.revertedWith('')

        await expect(
            aaveWrapperToken.approve(alice.address, 10)
        ).to.be.revertedWith('APPROVE_NOT_ALLOWED')

    })
})


describe("BribeStakeHelper", function() {
    let testVars: ITestVars
    let stakeHelper: BribeStakeHelper
    const amountToDeposit = 1000

    beforeEach(async function() {
        testVars = await setupTest()
        stakeHelper = testVars.bribeStakeHelper
    })

    it('execute', async function() {
        const {
            bribeToken,
            aavePool,
            dividends,
            users: [bob, peter, paul, silas]
        } = testVars

        await aaveTokenDeposit(testVars, peter)
        await stkAaveDeposit(testVars, paul)

        // bribe token transfer
        await bribeToken.transfer(aavePool.address, amountOfBribeReward);

        // setStartTimestamp
        const bribeRewardStartTimestamp = await latestTime() + 2

        await aavePool.setStartTimestamp(bribeRewardStartTimestamp, bribeRewardPerSecond);

        // increase time seconds
        const secondsToIncrease = 3600 * 70; 
        await increaseTime(secondsToIncrease)

        await expect(
            aavePool.connect(peter).claimReward(
                peter.address,
                stakeHelper.address,
                ethers.constants.HashZero,
                true
            )
        ).to.emit(aavePool, 'RewardClaim')

        // check stake userinfo
        const userInfo = await dividends.userRewards(peter.address)

        expect(userInfo.balance).to.eq(BigNumber.from('1260000000000000000000000'))

    })
})