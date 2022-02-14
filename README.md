# <img src="logo.svg" alt="OpenZeppelin" height="40px">
[![codecov](https://codecov.io/gh/NFTxCards/core-contracts/branch/master/graph/badge.svg?token=MEA8BD5FKP)](https://codecov.io/gh/NFTxCards/core-contracts)

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
- call Exchange.matchOrder with order and signature.

### Domain model

**Order**:

- `address` account - maker
- `address` taker - order executor (you can create order for a specific address)
- `OrderSide` side - type of order (buy or sell)
- `LibAsset.Asset` commodity (see [LibAsset](https://github.com/NFTxCards/core-contracts/blob/master/contracts/lib/LibAsset.sol#L27))
- `LibAsset.Asset` payment (see [LibAsset](https://github.com/NFTxCards/core-contracts/blob/master/contracts/lib/LibAsset.sol#L27))
- `uint64` expiry - expiration date
- `uint8` nonce - salt for order
- `bytes` permitSig - a signature the permissions on the part of the maker;
- `LibSig.Signature` orderSig - the signature of the entire order from the maker;

### Order validation

- check the existence of the order hash in the contract storage
- order signature verification
- check the executor of the order (zero address or a specific address)
- check commodity (for purchase order only ERC20 token)
- check the duration of the order
- check the side of the order (this determines the parameters of execution)
- check the amount of the order (or approve token) and the sending amount to execute the order

### Commission calculation

- contract there is a variable which is responsible for the total commission of the protocol
- at the time of execution of the order, the protocol deducts the protocol commission from the transaction amount (valid for ERC20 and ETH, as a payment)
- some tokens contain their own royalty, which is paid to the previous owner (executed for ERC721)

#### Order execution

we use a general transfer function that, depending on the type of payment currency, calls one or another sending method

### Token mint

we have a token purchase feature, which is necessary to mint tokens from the user side. Which only the exchange contract can call, is passed as a parameter to the token contract.

##### Cancelling the order

cancel function can be used to cancel order. Such orders won't be matched and error will be thrown. This function is used by order maker to mark orders unfillable. This function can be invoked only by order maker.

##### Contract events

Exchange contract emits these events:
- TokenBought (when user are mint token)
- OrderMatch (when orders are matched)
- OrderCancelled (when user cancels the order)

### License

Smart contracts for NFTxCards protocol are available under the [MIT License](LICENSE.md).
