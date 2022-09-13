import { BigNumber } from "@ethersproject/bignumber"
import { expect } from "chai"
import { deployments, ethers } from "hardhat"
import { BribeToken } from "../compiled-types"
import { getBribeTokenDeployment } from "../helper/contracts"
import { ContractId } from "../helper/types"

let bribeToken: BribeToken

describe("BribeToken", function() {
    before(async function () {
        bribeToken = await getBribeTokenDeployment()
    })

    it("checks: valid name, symbol and totalSupply", async function() {
        expect(
            await bribeToken.name()
        ).to.eq("Bribe Token");

        expect(
            await bribeToken.symbol()
        ).to.eq('BRIBE')

        expect(
            await bribeToken.totalSupply()
        ).to.eq(BigNumber.from(100_000_000).mul(BigNumber.from(10).pow(18)))
    })
})