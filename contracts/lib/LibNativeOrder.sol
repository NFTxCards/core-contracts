// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;

library LibNativeOrder {

  uint256 private constant _ORDER_TYPEHASH =
  0xce918627cb55462ddbb85e73de69a8b322f2bc88f4507c52fcad6d4c33c29d49;

  uint256 private constant UINT_256_MASK = (1 << 256) - 1;
  uint256 private constant UINT_128_MASK = (1 << 128) - 1;
  uint256 private constant UINT_64_MASK = (1 << 64) - 1;
  uint256 private constant ADDRESS_MASK = (1 << 160) - 1;

  enum OrderStatus {
    INVALID,
    FILLABLE,
    FILLED,
    CANCELLED,
    EXPIRED
  }

  struct Order {
    uint256 tokenId;
    address token;
    address maker;
    uint128 basePrice;
    uint64 expiry;
    uint64 listingTime;
    uint256 salt;
  }

  struct NewOrder {
    address token;
    uint256 tokenId;
    uint128 price;
    uint64 expirationTime;
    uint256 salt;
  }

  struct OrderInfo {
    bytes32 orderHash;
    OrderStatus status;
  }

  function getOrderStructHash(Order memory order)
  internal
  pure
  returns (bytes32 structHash)
  {
    // The struct hash is:
    // keccak256(abi.encode(
    //   TYPE_HASH,
    //   order.tokenId,
    //   order.token,
    //   order.maker,
    //   order.basePrice,
    //   order.expirationTime,
    //   order.salt,
    // ))
    assembly {
      let mem := mload(0x40)
      mstore(mem, _ORDER_TYPEHASH)
    // order.tokenId
      mstore(add(mem, 0x20), and(UINT_64_MASK, mload(order)))
    // order.token;
      mstore(add(mem, 0x40), and(ADDRESS_MASK, mload(add(order, 0x20))))
    // order.maker;
      mstore(add(mem, 0x60), and(ADDRESS_MASK, mload(add(order, 0x40))))
    // order.basePrice;
      mstore(add(mem, 0x80), and(UINT_128_MASK, mload(add(order, 0x60))))
    // order.expiry;
      mstore(add(mem, 0xA0), and(UINT_64_MASK, mload(add(order, 0x80))))
    // order.listingTime;
      mstore(add(mem, 0xC0), and(UINT_64_MASK, mload(add(order, 0xA0))))
    // order.salt;
      mstore(add(mem, 0xE0), mload(add(order, 0xC0)))
      structHash := keccak256(mem, 0x100)
    }
  }
}
