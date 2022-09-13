// import { expect } from "chai";
// import { ethers } from "hardhat";
// import { BigNumber } from "ethers";
// import { time } from "@openzeppelin/test-helpers";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signers";

// describe("Single Asset Pool", function () {
//   before(async function () {
//     const Erc20 = await ethers.getContractFactory("Erc20");
//     const BribePool = await ethers.getContractFactory("SampleSingleAsset");

//     this.governanceToken = await Erc20.deploy(
//       "GovernanceToken",
//       "GovernanceToken"
//     );
//     this.usdc = await Erc20.deploy("USDC", "USDC");

//     await this.governanceToken.deployed();
//     await this.usdc.deployed();

//     this.delayPeriod = 3600 * 24 * 3
//     this.bribePool = await BribePool.deploy(
//       "BribePool", // name
//       "BribePool", // symbol
//       this.governanceToken.address, // governance token
//       this.usdc.address, // bid asset
//       3600
//     );
//     await this.bribePool.deployed();

//     const users = await ethers.getSigners();
//     this.owner = users[0]
//     this.stakers = users.slice(0, 3);
//     this.bidders = users.slice(4);

//     const [alice, bob, carl] = this.stakers;

//     this.expiration = (await this.bribePool.expiration()).toNumber();

//     // set initial governance token balance and approve
//     const aliceGov = this.governanceToken.connect(alice);
//     const bobGov = this.governanceToken.connect(bob);
//     const carlGov = this.governanceToken.connect(carl);

//     await Promise.all([
//       aliceGov.mint(100),
//       bobGov.mint(100),
//       carlGov.mint(100),
//     ]);

//     await Promise.all([
//       aliceGov.approve(this.bribePool.address, 100),
//       bobGov.approve(this.bribePool.address, 100),
//       carlGov.approve(this.bribePool.address, 100),
//     ]);

//     // set initial usdc balance and approve
//     const [david, erin, frank] = this.bidders;
//     const davidUsdc = this.usdc.connect(david);
//     const erinUsdc = this.usdc.connect(erin);
//     const frankUsdc = this.usdc.connect(frank);

//     await Promise.all([
//       davidUsdc.mint(100),
//       erinUsdc.mint(100),
//       frankUsdc.mint(100),
//     ]);

//     await Promise.all([
//       davidUsdc.approve(this.bribePool.address, 1000),
//       erinUsdc.approve(this.bribePool.address, 1000),
//       frankUsdc.approve(this.bribePool.address, 1000),
//     ]);
//   });

//   describe("Initial deposit", async function () {
//     before(async function () {
//       const [alice, bob, carl] = this.stakers;
//       const aliceBribe = this.bribePool.connect(alice);
//       const bobBribe = this.bribePool.connect(bob);
//       const carlBribe = this.bribePool.connect(carl);

//       // deposit
//       await Promise.all([
//         aliceBribe.deposit(10),
//         bobBribe.deposit(20),
//         carlBribe.deposit(30),
//       ]);
//     });

//     it("Stakers get bribe tokens", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const aliceBribe = this.bribePool.connect(alice);
//       const bobBribe = this.bribePool.connect(bob);
//       const carlBribe = this.bribePool.connect(carl);

//       expect(await aliceBribe.balanceOf(alice.address)).to.equal(10);
//       expect(await bobBribe.balanceOf(bob.address)).to.equal(20);
//       expect(await carlBribe.balanceOf(carl.address)).to.equal(30);
//     });

//     it("Check stakers' remaining balance of governance token", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const aliceGov = this.governanceToken.connect(alice);
//       const bobGov = this.governanceToken.connect(bob);
//       const carlGov = this.governanceToken.connect(carl);

//       expect(await aliceGov.balanceOf(alice.address)).to.equal(90);
//       expect(await bobGov.balanceOf(bob.address)).to.equal(80);
//       expect(await carlGov.balanceOf(carl.address)).to.equal(70);
//     });
//   });

//   describe("First auction", async function () {
//     let proposalId: number, david: SignerWithAddress, erin: SignerWithAddress;

//     before(async function () {
//       proposalId = 0;
//       david = this.bidders[0];
//       erin = this.bidders[1];
//     });

//     it("First bid will set highest bidder to be himself", async function () {
//       const davidBribe = this.bribePool.connect(david);
//       const usdc = this.usdc.connect(erin);

//       const balance = await usdc.balanceOf(david.address);
//       await expect(davidBribe.bid(proposalId, 40, true))
//         .to.emit(davidBribe, "HighestBidIncreased")
//         .withArgs(proposalId, ethers.constants.AddressZero, david.address, 40);

//       const bid = await davidBribe.bids(proposalId);
//       expect(bid.highestBidder).to.equal(david.address);
//       expect(await usdc.balanceOf(david.address)).to.equal(balance.sub(40));
//     });

//     it("Bidder with lower price is rejected", async function () {
//       const erinBribe = this.bribePool.connect(erin);
//       await expect(erinBribe.bid(proposalId, 30, true)).to.revertedWith(
//         "LOW_BID"
//       );
//     });

//     it("Higher bidder will upgrade bid and refund usdc to previous highest bidder and update last vote end time", async function () {
//       const davidBribe = this.bribePool.connect(david);
//       const erinBribe = this.bribePool.connect(erin);
//       const usdc = this.usdc.connect(david);

//       const davidBalance = await usdc.balanceOf(david.address);
//       const erinBalance = await usdc.balanceOf(erin.address);

//       await expect(erinBribe.bid(proposalId, 80, true))
//         .to.emit(erinBribe, "HighestBidIncreased")
//         .withArgs(proposalId, david.address, erin.address, 80);

//       const bid = await davidBribe.bids(proposalId);
//       expect(bid.highestBidder).to.equal(erin.address);

//       expect(await usdc.balanceOf(david.address)).to.equal(
//         davidBalance.add(40)
//       );
//       expect(await usdc.balanceOf(erin.address)).to.equal(erinBalance.sub(80));
//     });

//     it("Check reward balance", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const bribePool = this.bribePool.connect(alice);

//       await expect(bribePool.distributeRewards(proposalId))
//         .to.revertedWith('BID_ACTIVE')

//       await time.increase(this.expiration);
//       await bribePool.distributeRewards(proposalId);

//       expect(await bribePool.rewardBalanceOf(alice.address)).to.equal(
//         BigNumber.from(Math.floor((80 * 10) / (10 + 20 + 30)))
//       );
//       expect(await bribePool.rewardBalanceOf(bob.address)).to.equal(
//         BigNumber.from(Math.floor((80 * 20) / (10 + 20 + 30)))
//       );
//       expect(await bribePool.rewardBalanceOf(carl.address)).to.equal(
//         BigNumber.from(Math.floor((80 * 30) / (10 + 20 + 30)))
//       );
//     });

//     it("First user claims reward and check usdc balance", async function () {
//       const [alice] = this.stakers;
//       const usdc = this.usdc.connect(alice);
//       const aliceUsdc = await usdc.balanceOf(alice.address);

//       await this.bribePool.connect(alice).claimReward();

//       expect(await usdc.balanceOf(alice.address)).to.equal(
//         aliceUsdc.add(Math.floor((80 * 10) / (10 + 20 + 30)))
//       );
//     });

//     it("Check reward balance after claim", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const bribePool = this.bribePool.connect(alice);

//       expect(await bribePool.rewardBalanceOf(alice.address)).to.equal(
//         BigNumber.from(0)
//       );
//       expect(await bribePool.rewardBalanceOf(bob.address)).to.equal(
//         BigNumber.from(Math.floor((80 * 20) / (10 + 20 + 30)))
//       );
//       expect(await bribePool.rewardBalanceOf(carl.address)).to.equal(
//         BigNumber.from(Math.floor((80 * 30) / (10 + 20 + 30)))
//       );
//     });

//     it("Cannot place bid when the proposal is expired", async function () {
//       const david = this.bidders[0];

//       await time.increase(3600);
//       const davidBribe = this.bribePool.connect(david);
//       await expect(davidBribe.bid(proposalId, 1000, true)).to.revertedWith(
//         "BID_ENDED"
//       );
//     });
//   });

//   describe("Second auction and additional stake", async function () {
//     const rewardBalance: any = {};

//     before(async function () {
//       const proposalId = 1;
//       const [alice, bob, carl] = this.stakers;
//       const david = this.bidders[0];
//       const davidBribe = this.bribePool.connect(david);
//       const aliceBribe = this.bribePool.connect(alice);
//       const bobBribe = this.bribePool.connect(bob);
//       const bribePool = davidBribe;

//       let tx = await bobBribe.deposit(20);

//       await aliceBribe.setDelayPeriod(this.delayPeriod);

//       expect(tx)
//         .to.emit(bobBribe, "Deposit")
//         .withArgs(bob.address, 20, await time.latest());

//       await time.increase(this.delayPeriod);

//       tx = await aliceBribe.withdraw(5);
//       expect(tx)
//         .to.emit(aliceBribe, "Withdraw")
//         .withArgs(alice.address, 5, await time.latest());

//       rewardBalance.alice = await bribePool.rewardBalanceOf(alice.address);
//       rewardBalance.bob = await bribePool.rewardBalanceOf(bob.address);
//       rewardBalance.carl = await bribePool.rewardBalanceOf(carl.address);

//       await davidBribe.bid(proposalId, 60, true);
//       await time.increase(this.expiration);
//       await bribePool.distributeRewards(proposalId);
//     });

//     it("check bribe token balance", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const bribePool = this.bribePool.connect(alice);

//       expect(await bribePool.balanceOf(alice.address)).to.equal(5);
//       expect(await bribePool.balanceOf(bob.address)).to.equal(40);
//       expect(await bribePool.balanceOf(carl.address)).to.equal(30);
//     });
//   });

//   describe('Third auction', function () {
//     const proposalId = 2

//     before(async function () {
//       const [alice] = this.bidders;
//       await this.bribePool.connect(alice).bid(proposalId, 10, true)
//     })

//     it('block and unblock proposal', async function () {
//       const [highestBid, , , , highestBidder] = await this.bribePool.bids(proposalId)
//       const balance = await this.usdc.balanceOf(highestBidder)

//       await expect(this.bribePool.connect(this.owner).blockProposalId(proposalId))
//         .emit(this.bribePool, 'BlockProposalId')

//       expect((await this.usdc.balanceOf(highestBidder)).toNumber())
//         .to.equal(balance.add(highestBid).toNumber())

//       await expect(this.bribePool.connect(this.owner).unblockProposalId(proposalId))
//         .emit(this.bribePool, 'UnblockProposalId')
//     })

//     it('reward is distributed for proposals voted so far', async function () {
//       const [alice] = this.stakers;
//       const [bob] = this.bidders;

//       const reward = await this.bribePool.rewardBalanceOf(alice.address)

//       await this.bribePool.connect(bob).bid(proposalId, 30, true)

//       await time.increase(this.expiration)

//       await this.bribePool.vote(proposalId, true);

//       expect((await this.bribePool.rewardBalanceOf(alice.address)).toNumber())
//         .to.greaterThan(reward.toNumber())
//     })

//     it('withdraw fails right after vote', async function () {
//       const [alice] = this.stakers;

//       await expect(this.bribePool.connect(alice).withdraw(3))
//         .to.revertedWith('ACTIVE_DELAY_PERIOD')
//     })
//   })

//   describe('Check rewards of stakers', function () {            
//     it("Reward balance is calculated for only voted proposals after last claimation", async function () {
//       const [alice, bob, carl] = this.stakers;
//       const [david] = this.bidders;
      
//       await this.usdc.connect(david).mint(100)

//       await this.bribePool.connect(david).bid(3, 100, true); // new proposal that is not voted won't affect on reward distribution

//       // highest bid in each proposal is 80, 60, 10
//       // alice already claimed after first proposal completed
//       // bob made additional deposit before second proposal, hence claimed
//       // carl neither deposited nor withdrew so far
//       expect(await this.bribePool.rewardBalanceOf(alice.address)).to.equal(
//         Math.floor(((60 + 30) * 5) / (5 + 40 + 30))
//       );
//       expect(await this.bribePool.rewardBalanceOf(bob.address)).to.equal(
//         Math.floor(((60 + 30) * 40) / (5 + 40 + 30))
//       );
//       expect(await this.bribePool.rewardBalanceOf(carl.address)).to.equal(
//         Math.floor(((80 + 60 + 30) * 30) / (5 + 40 + 30))
//       );
//     })
//   })
// });
