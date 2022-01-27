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
        goerli: {
            url: `https://goerli.infura.io/v3/${process.env.INFURA_TOKEN}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
        },
        mainnet: {
            url: `https://mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
            accounts: [`${process.env.PRIVATE_KEY}`],
        },
        bsc: {
            url: "https://bsc-dataseed.binance.org/",
            chainId: 56,
            gasPrice: 20000000000,
            accounts: [`${process.env.PRIVATE_KEY}`],
        },
        matic: {
            url: `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_TOKEN}`,
            chainId: 137,
            gasPrice: 5000000000,
            accounts: [`${process.env.PRIVATE_KEY}`],
        },
        xdai: {
            url: "https://xdai.stormdapps.com",
            chainId: 100,
            gasPrice: 20000000000,
            accounts: [`${process.env.PRIVATE_KEY}`],
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
