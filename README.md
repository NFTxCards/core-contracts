# <img src="logo.svg" alt="OpenZeppelin" height="40px">
[![codecov](https://codecov.io/gh/NFTxCards/core-contracts/branch/master/graph/badge.svg?token=MEA8BD5FKP)](https://codecov.io/gh/NFTxCards/core-contracts)

## Consists of

- Exchange: responsible for sales, auctions etc.
- TokenTrader: responsible for minting NFTs.
- Tokens: for storing information about NFTs.

## Compile, Test, Deploy

```shell
yarn
yarn test
```

## Overview of the protocol

NFTxCards protocol is a combination of smart-contracts for exchanging tokens, tokens themselves, APIs for order creation, discovery, standards used in smart contracts.

Protocol is primarily targeted to NFTs, but it's not limited to NFTs only. Any asset on EVM blockchain can be traded on NFTxCards.

Smart contracts are constructed in the way to be upgradeable, orders have versioning information, so new fields can be added if needed in future.

## Trade process overview

Users should do these steps to successfully trade on NFTxCards:

- approve (permit) transfers for their assets to Exchange contracts (e.g.: call approveForAll for ERC-721 and ERC1155, approve for ERC-20) - amount of money needed for trade is price + fee on top of that.
- sign trading order via preferred wallet (order is like a statement "I would like to sell my precious crypto kitty for 10 ETH")
- save this order and signature to the database using NFTxCards protocol API

If user wants to cancel order, he must call cancel function of the Exchange smart contract

Users who want to purchase something on NFTxCards should do the following:

- find asset they like with an open order
- approve transfers the same way (if not buying using Ether)
- form order in the other direction (statement like "I would like to buy precious crypto kitty for 10 ETH")
- call Exchange.matchOrder with orders and signature.

### License

Smart contracts for NFTxCards protocol are available under the [MIT License](LICENSE.md).
