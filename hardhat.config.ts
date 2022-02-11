import "@typechain/hardhat";
import "@nomiclabs/hardhat-ethers";
import "hardhat-etherscan-abi";
import "@nomiclabs/hardhat-waffle";
import "hardhat-abi-exporter";
import "@nomiclabs/hardhat-etherscan";
import "solidity-coverage";
import "@openzeppelin/hardhat-upgrades";
import { HardhatUserConfig } from "hardhat/config";
require("dotenv").config();

const ethereumConfig = {
    url: process.env.INFURA_API_KEY || "",
    accounts:
      process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
};

const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.9",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        goerli: ethereumConfig,
        mainnet: ethereumConfig,
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        matic: {
            url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
            chainId: 137,
            gasPrice: 5000000000,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
        xdai: {
            url: "https://xdai.stormdapps.com",
            chainId: 100,
            gasPrice: 20000000000,
            accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
        },
    },
    abiExporter: {
        path: "./data/abi",
        clear: true,
        flat: true,
        spacing: 2,
    },
    etherscan: {
        apiKey: process.env.ETHERSAN_API_KEY,
    },
    typechain: {
        outDir: "types",
        target: "ethers-v5",
    },
};

export default config;
