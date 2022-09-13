import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { network, ethers } from "hardhat";

import { BribePoolFactory } from "../compiled-types/BribePoolFactory";
import { BribePoolFactory__factory } from "../compiled-types/factories/BribePoolFactory__factory";

import { BribePool } from "../compiled-types/BribePool";
import { BribePool__factory } from "../compiled-types/factories/BribePool__factory";

import { MintableERC20 } from "../compiled-types/MintableERC20";
import { MintableERC20__factory } from "../compiled-types/factories/MintableERC20__factory";

import { sha256 } from "ethers/lib/utils";
import { BigNumber } from "@ethersproject/units/node_modules/@ethersproject/bignumber";
import Web3 from "web3";

const web3 = new Web3();

describe.only("Bribe Pots", async () => {
  let signers: SignerWithAddress[];
  let bpf: BribePoolFactory;
  let bpImplementation: BribePool;
  let underlyingToken: MintableERC20;

  let amountToMint = "100000000000000000000";
  let snapshotId: any;

  before(async () => {
    signers = await ethers.getSigners();
    bpImplementation = await new BribePool__factory(signers[0]).deploy();
    underlyingToken = await new MintableERC20__factory(signers[0]).deploy("Test Token", "TT");

    bpf = await new BribePoolFactory__factory(signers[1]).deploy(
      signers[0].address,
      bpImplementation.address,
      underlyingToken.address
    );

    await underlyingToken.connect(signers[0]).mint(signers[0].address, amountToMint);
    await underlyingToken.connect(signers[0]).mint(signers[1].address, amountToMint);
    await underlyingToken.connect(signers[0]).mint(signers[2].address, amountToMint);
    await underlyingToken.connect(signers[0]).mint(signers[3].address, amountToMint);
  });

  beforeEach(async () => {
    snapshotId = await network.provider.request({
      method: "evm_snapshot",
      params: [],
    });
  });

  afterEach(async () => {
    await network.provider.request({
      method: "evm_revert",
      params: [snapshotId],
    });
  });

  it("Test", async () => {
    await expect(bpf.connect(signers[0]).renounceOwnership()).to.revertedWith("1");
  });

  it("Create Pool", async () => {
    await expect(
      bpf.connect(signers[0]).createBribePool("SomePool", signers[0].address, signers[0].address, 1)
    ).to.emit(bpf, "CreatedNewBribePool");
    console.log("SomePool address", await bpf.bribePools("SomePool"));
  });

  it("Create proposal", async () => {
    let poolOwner = signers[1];
    await expect(
      bpf.connect(signers[0]).createBribePool("SomePool", poolOwner.address, poolOwner.address, 0)
    ).to.be.revertedWith("20");

    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = new Date().valueOf() + 86400000;
    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await expect(bribePool.createProposal(proposalId, expiry)).to.be.revertedWith("4");
  });

  it("Create bribe Pot", async () => {
    let poolOwner = signers[1];
    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = new Date().valueOf() + 86400000;
    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "200");

    await expect(bribePool.createBribePot(proposalId, "1", "1"))
      .to.emit(bribePool, "CreatedBribePot")
      .withArgs(proposalId, "1");
    await expect(bribePool.createBribePot(proposalId, "1", "1")).to.be.revertedWith("15");
  });

  it("Deposit", async () => {
    let poolOwner = signers[1];
    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = new Date().valueOf() + 86400000;
    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");

    await expect(bribePool.createBribePot(proposalId, "1", "2"))
      .to.emit(bribePool, "CreatedBribePot")
      .withArgs(proposalId, "1");

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");
    await expect(bribePool.deposit(proposalId, "1", poolOwner.address, "100"))
      .to.emit(bribePool, "DepositedBribe")
      .withArgs(proposalId, "1", poolOwner.address, "100");
  });

  it("Withdraw Bribe", async () => {
    let poolOwner = signers[1];
    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = BigNumber.from(new Date().valueOf()).div(1000).add(86400).toNumber();

    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");

    await expect(bribePool.createBribePot(proposalId, "1", "3"))
      .to.emit(bribePool, "CreatedBribePot")
      .withArgs(proposalId, "1");

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");
    await expect(bribePool.deposit(proposalId, "1", poolOwner.address, "100"))
      .to.emit(bribePool, "DepositedBribe")
      .withArgs(proposalId, "1", poolOwner.address, "100");

    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 + 1000],
    });

    await expect(bribePool.withdraw(proposalId, "1", poolOwner.address)).to.emit(
      bribePool,
      "WithdrawDeposit"
    );
  });

  it("Withdraw Dead Funds", async () => {
    let poolOwner = signers[1];
    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = BigNumber.from(new Date().valueOf()).div(1000).add(86400).toNumber();

    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");

    await expect(bribePool.createBribePot(proposalId, "1", "2"))
      .to.emit(bribePool, "CreatedBribePot")
      .withArgs(proposalId, "1");

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");
    await expect(bribePool.deposit(proposalId, "1", poolOwner.address, "100"))
      .to.emit(bribePool, "DepositedBribe")
      .withArgs(proposalId, "1", poolOwner.address, "100");

    await network.provider.request({
      method: "evm_increaseTime",
      params: [31 * 86400 + 1000],
    });

    await expect(bribePool.withdrawDeadFunds(proposalId, "1", poolOwner.address)).to.emit(
      bribePool,
      "WithdrawDeadFunds"
    );
  });

  it("Submit Root and claim rewards", async () => {
    let poolOwner = signers[1];
    await bpf
      .connect(signers[0])
      .createBribePool("SomePool", poolOwner.address, poolOwner.address, 1);
    let poolAddress = await bpf.bribePools("SomePool");
    let proposalId = sha256(Buffer.from("1"));
    let bribePool: BribePool = await new BribePool__factory(poolOwner).attach(poolAddress);

    let expiry: number = BigNumber.from(new Date().valueOf()).div(1000).add(86400).toNumber();

    await expect(bribePool.createProposal(proposalId, expiry))
      .to.emit(bribePool, "CreatedProposal")
      .withArgs(proposalId);

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "100");

    await expect(bribePool.createBribePot(proposalId, "1", "5"))
      .to.emit(bribePool, "CreatedBribePot")
      .withArgs(proposalId, "1");

    await underlyingToken.connect(poolOwner).approve(bribePool.address, "321");
    await expect(bribePool.deposit(proposalId, "1", poolOwner.address, "321"))
      .to.emit(bribePool, "DepositedBribe")
      .withArgs(proposalId, "1", poolOwner.address, "321");

    await network.provider.request({
      method: "evm_increaseTime",
      params: [86400 / 2],
    });

    console.log("proposal state", await (await bribePool.proposals(proposalId)).proposalState);

    let merkleRoot = sha256(Buffer.from("root"));
    let totalVotes = 1000;
    await expect(bribePool.submitMerkleRoot(proposalId, "1", [], merkleRoot, totalVotes))
      .to.emit(bribePool, "SubmittedMerkleRoot")
      .withArgs(proposalId, "1", merkleRoot, totalVotes);

    let leaf = web3.eth.abi.encodeParameters(
      ["uint256", "address"],
      [`${totalVotes}`, `${poolOwner.address}`]
    );
    let proof = [
      sha256(Buffer.from("node-1")),
      sha256(Buffer.from("node-2")),
      sha256(Buffer.from("node-3")),
      sha256(Buffer.from("node-4")),
      sha256(Buffer.from("node-5")),
      sha256(Buffer.from("node-6")),
      sha256(Buffer.from("node-7")),
      sha256(Buffer.from("node-8")),
      sha256(Buffer.from("node-9")),
      sha256(Buffer.from("node-10")),
    ];
    await expect(bribePool.claimRewards(proposalId, "1", proof, leaf))
      .to.emit(bribePool, "ClaimReward")
      .withArgs(proposalId, "1", poolOwner.address, "421");

    await expect(bribePool.claimRewards(proposalId, "1", proof, leaf)).to.be.revertedWith("13");
  });
});
