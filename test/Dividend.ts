import { expect } from "chai";
import { network, ethers, deployments } from "hardhat";
import { Dividends } from "../compiled-types";
import { deployMockFeeDistributor, deployMockPool } from "../helper/contracts";
import { ContractId } from "../helper/types";
import { ITestVars, setupTest } from "./lib";

describe("Dividends", function() {
    let testVars: ITestVars
    let dividends: Dividends
    const amountToDeposit = 1000

    beforeEach(async function() {
        testVars = await setupTest()
        dividends = testVars.dividends
    })

    it('constructor', async function() {
        const factory = await ethers.getContractFactory(ContractId.Dividend);
        const [receiver1, receiver2] = testVars.users

        await expect(
            factory.deploy(
                ethers.constants.AddressZero,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero
            )
        ).to.be.revertedWith('INVALID_ASSET')
        
        await expect(
            factory.deploy(
                receiver1.address,
                ethers.constants.AddressZero,
                ethers.constants.AddressZero
            )
        ).to.be.revertedWith('INVALID_STAKE_ASSET')
        
        await expect(
            factory.deploy(
                receiver1.address,
                receiver1.address,
                ethers.constants.AddressZero
            )
        ).to.be.revertedWith('INVALID_FEE_ASSET')
    })

    it('stake', async function() {
        const [user1, user2,] = testVars.users

        await expect(
            dividends.stake(
                ethers.constants.AddressZero,
                0,
                false
            )
        ).to.be.revertedWith('INVALID_TO')

        await expect(
            dividends.stake(
                user1.address,
                0,
                false
            )
        ).to.be.revertedWith('INVALID_AMOUNT')

        await testVars.bribeToken.approve(dividends.address, amountToDeposit)

        await expect(
            dividends.stake(
                user1.address,
                amountToDeposit,
                false
            )
        ).to.emit(dividends, 'Stake')
            .withArgs(dividends.address, user1.address, user1.address, amountToDeposit)

        const userData = await dividends.userRewards(user1.address)
        expect(userData.map(x => x.toNumber())).to.deep.eq([0, 0, amountToDeposit])
        expect((await dividends.totalStaked()).toNumber()).to.eq(amountToDeposit)
    })

    it('unstake', async function() {
        const [user1, user2,] = testVars.users
        const amountToDeposit = 1000
        
        // user should stake
        await testVars.bribeToken.approve(dividends.address, amountToDeposit)
        await dividends.stake(
            user1.address,
            amountToDeposit,
            false
        )
        // should fail to unstake with double the amount
        await expect(
            dividends.unstake(
                amountToDeposit * 2,
                false
            )
        ).to.be.reverted
        
        const prevBalance = await testVars.bribeToken.balanceOf(user1.address)
        await expect(
            dividends.unstake(
                amountToDeposit,
                false
            )
        ).to.emit(dividends, 'Unstake')
            .withArgs(user1.address, amountToDeposit)
        
        const newBalance = await testVars.bribeToken.balanceOf(user1.address)

        expect(newBalance.sub(prevBalance).toNumber()).to.eq(amountToDeposit)
    })

    it('pause', async function() {
        const [user1, user2,] = testVars.users
        
        await expect(
            dividends.connect(user2).pause()
        ).to.be.revertedWith('Ownable: caller is not the owner')
        
        await expect(
            dividends.pause()
        ).to.emit(dividends, 'Paused')
            .withArgs(user1.address)

        await expect(
            dividends.claimUserDividend(false)
        ).to.be.revertedWith('Pausable: paused')

        await expect(
            dividends.stake(user1.address, 1000, false)
        ).to.be.revertedWith('Pausable: paused')

        await expect(
            dividends.accrueDividend()
        ).to.be.revertedWith('Pausable: paused')
    })

    it('unpause', async function() {
        const [user1, user2,] = testVars.users

        await expect(
            dividends.unpause()
        ).to.be.revertedWith('Pausable: not paused')

        await dividends.pause()

        await expect(
            dividends.connect(user2).unpause()
        ).to.be.revertedWith('Ownable: caller is not the owner')

        await expect(
            dividends.unpause()
        ).to.emit(dividends, 'Unpaused')
            .withArgs(user1.address)

        // @TODO check that we can call all the necessary
        // functions
    })

    it('rescueFunds', async function() {
        const [user1, user2,] = testVars.users

        await expect(
            dividends.connect(user2).rescueFunds()
        ).to.be.revertedWith('Ownable: caller is not the owner')
        
        const amountToRescue = 10000
        await testVars.usdc.mintTo(dividends.address, amountToRescue)
        
        const prevBalance = await testVars.usdc.balanceOf(user1.address)

        await expect(
            dividends.rescueFunds()
        ).to.emit(dividends, 'RescueFunds')
            .withArgs(amountToRescue)
        
        const newBalance = await testVars.usdc.balanceOf(user1.address)
        
        expect(newBalance.sub(prevBalance).toNumber()).to.eq(amountToRescue)
    })

    it('setFeeDistributor', async function() {
        const [,user2,] = testVars.users

        await expect(
            dividends.connect(user2).setFeeDistributor(user2.address)
        ).to.be.revertedWith('Ownable: caller is not the owner')

        await expect(
            dividends.setFeeDistributor(user2.address)
        ).to.emit(dividends, 'UpdateFeeDistributor')
            .withArgs(user2.address)
    })

    it('accrueDividend', async function() {
        const [,user2,] = testVars.users
        const amountToMint = 1000

        // set allocation
        await testVars.feeDistribution.setFeeReceivers(
            [dividends.address],
            [10]
        )
        const pool = await deployMockPool(
            testVars.usdc.address, true
        )
        await testVars.usdc.mintTo(pool.address, amountToMint)
        await testVars.feeDistribution.claimFees(
            [pool.address]
        )
        
        await expect(
            dividends.accrueDividend()
        ).to.emit(dividends, 'DistributeDividend')
            .withArgs(amountToMint)
    })

    it('accrueDividend', async function () {
        const { feeDistribution } = testVars
        const [bob, peter,] = testVars.users

        /// deploys a mock pool
        const pool = await deployMockPool(
            testVars.usdc.address, true
        )

        await testVars.usdc.mintTo(pool.address, amountToDeposit)
        await feeDistribution.setFeeReceivers([dividends.address], [1])     
        await feeDistribution.claimFees([pool.address])

        await expect(
            dividends.accrueDividend()
        ).to.emit(dividends, 'DistributeDividend')
            .withArgs(amountToDeposit)
        
        expect((await dividends.totalDividendsReceived()).toNumber()).to.eq(amountToDeposit)
        
        // @TODO add check for faulty fee distributor
        const faultyFeeDistributor = await deployMockFeeDistributor(testVars.usdc.address, false)
        // const 

    })

    it('claimUserDividend', async function() {
        const { feeDistribution, bribeToken } = testVars
        const [bob, peter, paul] = testVars.users

        const pool = await deployMockPool(
            testVars.usdc.address, true
        )

        await testVars.usdc.mintTo(pool.address, amountToDeposit)       
        await feeDistribution.setFeeReceivers([dividends.address], [1])
        await feeDistribution.claimFees([pool.address])

        await bribeToken.approve(dividends.address, amountToDeposit)
        await dividends.stake(
            bob.address,
            amountToDeposit,
            false
        )
        
        await bribeToken.transfer(peter.address, amountToDeposit)
        await bribeToken.connect(peter).approve(dividends.address, amountToDeposit)

        await dividends.connect(peter).stake(
            peter.address,
            amountToDeposit,
            true
        )

        expect((await dividends.dividendOf(bob.address)).toNumber()).to.eq(amountToDeposit)
        expect((await dividends.dividendOf(peter.address)).toNumber()).to.eq(0)

        await dividends.claimUserDividend(false)

        expect((await dividends.dividendOf(bob.address)).toNumber()).to.eq(0)
    })

})