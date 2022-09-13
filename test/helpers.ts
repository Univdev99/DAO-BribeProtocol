import { BigNumber } from "ethers";
import { network, ethers, deployments } from "hardhat";
import { format } from "path/posix";

export const generateRandomBytes32 = () => {
  return '0x' +
    new Array(32).fill(0)
      .map(() => ('00' + Math.floor(Math.random() * 256).toString(16)).slice(-2))
      .join('')
}

export const bytes32 = (value: number) =>
  '0x' + value.toString(16).padStart(32 * 2, '0')

const toBytes32 = (bn: BigNumber) => {
    return ethers.utils.hexlify(ethers.utils.zeroPad(bn.toHexString(), 32));
};

export const setUserAaveTokenBalance = async(test: any, account: string, address: string, value: BigNumber) => {
  for( let i = 0; i < 1; i++) {
    const valueSlot = ethers.utils.solidityKeccak256(
        ['uint256', 'uint256'],
        [account, 0]
    );

    // console.log({ valueSlot })
    const accountToImpersonate = '0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7';

    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [accountToImpersonate],
    });

    const signer = await ethers.getSigner(accountToImpersonate)
    const balanceOf1 = await test.aaveTokenV2.balanceOf('0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7');
    console.log('balanceOf1')
    console.log(balanceOf1.toString())    
    
    await (await test.aaveTokenV2.connect(signer).transfer(account, 10000000000)).wait();
    console.log({ account })

    // await ethers.provider.send("hardhat_setStorageAt",
    //   [
    //     test.aaveTokenV2.address,
    //     valueSlot,
    //     toBytes32(BigNumber.from("10")).toString()
    //   ]
    // )
    // await ethers.provider.send("evm_mine", []); // Just mines to the next block

    const balance = await test.aaveTokenV2.balanceOf(account);
    const balanceOf = await test.aaveTokenV2.balanceOf('0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7');

    console.log('balance')
    console.log(balance.toString())
    console.log(balanceOf.toString())

    if (balance.gt(BigNumber.from('0'))) break;

    const d = await (await ethers.getDefaultProvider()).getStorageAt(
      test.aaveTokenV2.address,
      ethers.utils.solidityKeccak256(
        ["uint256", "uint256"],
        ['0x26a78d5b6d7a7aceedd1e6ee3229b372a624d8b7', i] // key, slot (solidity)
      )
    );

    console.log({ d })

    // await network.provider.
  }

}