# Bribe Protocol

## Summary

The idea of Bribe Protocol is to be able to sell the voting power of the governance tokens you hold by staking them in a designated pool.
On Bribe Protocol each supported governance token has its own staking pool. E.g. there will be a pool for Sushi, Yearn and so on. The pool will need to be able to participate in each token’s governance system, meaning that the Sushi pool will vote on Sushi governance proposals with all of the voting power accumulated through Bribe Protocol. Which decisions will be taken is being decided by a bidding system, in which the highest bidder gets to decide which option the pool will vote on. The amount paid by the highest bidder will be proportionally distributed among all pool participants, as well as additional $BRIBE token rewards.
Each bidding is only for one ongoing governance decision. So for every governance decision there would need to be a new bidding period.

![image](https://user-images.githubusercontent.com/18642714/129100383-2433cc3e-5693-4041-9900-f4b646701572.png)

## Architecture

Bribe protocol for each protocol (Sushi, Yearn, etc) inherits from `BribePool` contract, which is abstract and has all basic features like staking, reward distribution, bid and etc.
BribePool has an interface of common functions like `getAuctionExpiration` and it needs child contract to have detailed implementation.
In each protocol defined as child contract, only highest bidder will be able to vote on the proposal id after the bid ends.

### BribePool

- Governance token

Governance token of per protocol (Sushi, Yearn, ...)

- Asset token

Token used for bid

- Deposit

Staker deposits with governance token and he/she will get BRIBE token for it.

- Withdraw

Staker will receive rewards calculated proportionally to his staking amount, and governance token will be refunded to him/her. BRIBE token will be burned from him.

- Bid

Bidder will place a bid on certain proposal id with asset token.

- Auction expiration

Auction expiration will be determined on the first bid on the proposal and since the expiration will be determined differently in each protocol, each child contract per protocol will have `getAuctionExpiration` function overriden from parent.

- Rewards

When staker claims reward, he will get rewards calculated proportionally to his staking amount from bid index (total amount of money put by bidders) made by bidders.

- How does the code calculate reward

`lastAssetBalance` keeps bid index from one's last moment of claim. When he claims reward, difference between current bid index and `lastAssetBalance` will be amount of money put in bids since his last claim and this is where his rewards will be distributed from.
So the reward is calculated as:
```
reward = (current bid index - last asset balance) * (user staking amount / total staking amount)
```

### AavePool

- Auction expiration

An hour before the expiration of Aave proposal

## Test

```sh

npm test

```

### AavePool

Since AaveGovernance deployed on mainnet will be used for testing bid and auction expiration, the test code benefits from [Hardhat mainnet forking](https://hardhat.org/hardhat-network/guides/mainnet-forking.html).
