# Core contracts

Dillinger uses a number of open source projects to work properly:
- [Hardhat](https://hardhat.org/) - Contracts testing.

## Installation

Dillinger requires [Node.js](https://nodejs.org/) v14+ to run.

Install the dependencies and devDependencies and start test.

```sh
cd core-contracts
yarn
yarn compile
```

## Development

Open your favorite Terminal and run these commands.
> Note: `INFURA_TOKEN, PRIVATE_KEY` check your env file.

Start fork:

```sh
npx hardhat node --fork https://eth-mainnet.alchemyapi.io/v2/API_KEY --fork-block-number 13041702
```

Run scripts/test in custom network:

```sh
npx hardhat run scripts/deploy.js --network localhost
npx hardhat test --network localhost
```

#### Building for source

For production release:

```sh
yarn compile
yarn deploy
```

