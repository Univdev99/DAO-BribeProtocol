import { HardhatUserConfig } from "hardhat/types";
import { task } from "hardhat/config"
import "@nomiclabs/hardhat-waffle"
import "@nomiclabs/hardhat-ethers"
import "hardhat-deploy"
import "@typechain/hardhat";
import "solidity-coverage";
// import "hardhat-contract-sizer";
import 'hardhat-log-remover';
import "hardhat-gas-reporter";

import dotenv from 'dotenv';

dotenv.config()

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */

export default {
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  loggingEnabled: true,
  mocha: {
    timeout: 1000000
  },
  typechain: {
    outDir: "compiled-types/",
    target: "ethers-v5",
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: true,
    outputFile: 'gasReport.md',
    noColors: true,
    gasPrice: 100,
    currency: 'USD',
    coinmarketcap: 'c40041ca-81fa-4564-8f95-175e388534c1',
  },
  namedAccounts: {
    deployer: {
      default: 0,
      kovan: 0,
      mainnet: 1
    },
    bribeMultisig: process.env.BRIBE_MULTISIG || 1
  },
  networks: {
    hardhat: {
      loggingEnabled: false,
      // forking: {
      //   url: `https://eth-mainnet.alchemyapi.io/v2/${process.env.ALCHEMY_KEY}`,
      //   blockNumber: 12650400
      // }
    },
    kovan: {
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      // url: process.env.KOVAN_ALCHEMY_API
      url: "https://eth-kovan.alchemyapi.io/v2/M6qPjym_xS1lMm06pXcuKKJAYBUaxFmV"
    },
    mainnet: {
      accounts: {
        mnemonic: process.env.MNEMONIC || "",
      },
      url: process.env.MAINNET_ALCHEMY_API
    }
  }
} as HardhatUserConfig;
