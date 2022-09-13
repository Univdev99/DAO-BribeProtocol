import { expect } from "chai";
import exp from "constants";
import { network, ethers, deployments } from "hardhat";
import { FeeDistribution } from "../compiled-types";
import { deployMockPool } from "../helper/contracts";
import { ContractId } from "../helper/types";
import { ITestVars, latestTime, setupTest } from "./lib";

describe("FeeDistribution", function() {
    let testVars: ITestVars
    let feeDistribution: FeeDistribution

    beforeEach(async function() {
        testVars = await setupTest()
        feeDistribution = testVars.feeDistribution
    })

    it("constructor - invalid fee asset", async function() {
        const factory = await ethers.getContractFactory(ContractId.FeeDistribution);
        await expect(
            factory.deploy(ethers.constants.AddressZero)
        ).to.be.revertedWith('INVALID_FEE_ASSET')
    })

    it('setFeeReceivers', async function() {
        const [receiver1, receiver2] = testVars.users

        await expect(
            feeDistribution.setFeeReceivers(
                [receiver1.address, receiver2.address],
                [5]
            )
        ).to.be.revertedWith('INVALID_SIZE')
        
        // initial configuration
        await expect(
            feeDistribution.setFeeReceivers(
                [receiver1.address, receiver2.address],
                [5, 5]
            )
        ).to.emit(feeDistribution, 'SetFeeReceiver')
            .withArgs(receiver1.address, 0, 5)
            .emit(feeDistribution, 'SetFeeReceiver')
            .withArgs(receiver2.address, 0, 5)
        
        // second configuration
        await expect(
            feeDistribution.setFeeReceivers(
                [receiver1.address],
                [10]
            )
        ).to.emit(feeDistribution, 'SetFeeReceiver')
            .withArgs(receiver1.address, 5, 10)
        
        const data = await feeDistribution.feeReceiverData(receiver1.address)
        expect(data.map(x => x.toNumber())).to.deep.eq([0, 10, 0])

        expect((await feeDistribution.totalAllocPoints()).toNumber()).to.eq(15)
    })

    it('rescueFunds', async function() {
        const amountToMint = 1000
        await testVars.usdc.mintTo(feeDistribution.address, amountToMint);
        const [,,receiver3] = testVars.users

        await expect(
            feeDistribution.rescueFunds(receiver3.address)
        ).to.emit(feeDistribution, 'RescueFunds')
            .withArgs(feeDistribution.address, amountToMint)

        expect((await testVars.usdc.balanceOf(feeDistribution.address))
            .toNumber()).to.eq(0)
    })

    it('claimFees', async function() {
        const amountToMint = 1000
        const pool = await deployMockPool(
            testVars.usdc.address, true
        )
        await testVars.usdc.mintTo(pool.address, amountToMint)
        const [bob, peter, paul] = testVars.users

        await feeDistribution.setFeeReceivers(
            [bob.address],
            [1]
        )

        await expect(
            feeDistribution.claimFees(
                [pool.address]
            )
        ).to.emit(feeDistribution, 'ClaimFees')
            .withArgs(amountToMint, amountToMint)

        expect((await feeDistribution.totalFeesReceived())
            .toNumber()).to.eq(amountToMint)

        // should revert with a fake pool
        const fakePool = await deployMockPool(
            testVars.usdc.address, false
        )
        await testVars.usdc.mintTo(fakePool.address, amountToMint)
        await expect(
            feeDistribution.claimFees(
                [fakePool.address]
            )
        ).to.be.revertedWith('INVALID_CLAIM')
    })

    it('distributeFeeTo', async function() {
        const [bob, peter, paul] = testVars.users
        const pool = await deployMockPool(
            testVars.usdc.address, true
        )
        const amountToMint = 1000
        await testVars.usdc.mintTo(pool.address, amountToMint)

        await feeDistribution.setFeeReceivers(
            [bob.address],
            [1]
        )

        await feeDistribution.claimFees([pool.address])
    
        await expect(
            feeDistribution.distributeFeeTo(bob.address)
        ).to.emit(feeDistribution, 'FeesTransferred')
            // .withArgs(bob.address, amountToMint, await latestTime() + 1)

        await feeDistribution.setFeeReceivers(
            [paul.address],
            [1]
        )

        expect((await feeDistribution.totalAllocPoints()).toNumber()).to.eq(2)
        
        const prev = await testVars.usdc.balanceOf(paul.address)
        await expect(
            feeDistribution.connect(paul).distributeFeeTo(paul.address)
        ).to.emit(feeDistribution, 'FeesTransferred')
        const current = await testVars.usdc.balanceOf(paul.address)
        
        expect(prev.toNumber()).to.eq(current.toNumber())
    })


    it('pause', async function() {
        await expect(
            feeDistribution.pause()
        ).to.emit(feeDistribution, 'Paused')

        await expect(
            feeDistribution.claimFees([])
        ).to.be.revertedWith('Pausable: paused')

        await expect(
            feeDistribution.distributeFeeTo(ethers.constants.AddressZero)
        ).to.be.revertedWith('Pausable: paused')
    })

    it('unpause', async function() {
        const [receiver1, receiver2] = testVars.users
        await feeDistribution.pause()
        
        await expect(
            feeDistribution.unpause()
        ).to.emit(feeDistribution, 'Unpaused')

        // await expect(
        //     feeDistribution.claimFees([])
        // ).to.not.be.reverted

        // await expect(
        //     feeDistribution.connect(receiver1).distributeFeeTo(receiver1.address)
        // ).to.not.be.reverted
    })

    
})