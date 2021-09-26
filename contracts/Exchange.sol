// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma abicoder v2;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

import "./lib/LibNativeOrder.sol";
import "./lib/LibNativeOrdersStorage.sol";

contract Exchange {
  event CreateOrder(address indexed from, bytes32 orderHash, LibNativeOrder.Order indexed order);

  function createOrder(LibNativeOrder.NewOrder memory _order) public {
    // TODO check approve
    require(IERC721(_order.token).ownerOf(_order.tokenId) == msg.sender, "Only owner token can create order");

    LibNativeOrder.Order memory order = LibNativeOrder.Order({
      maker: msg.sender,
      token: _order.token,
      basePrice: _order.price,
      tokenId: _order.tokenId,
      listingTime: uint64(block.timestamp),
      expiry: _order.expirationTime,
      salt: _order.salt
    });

    bytes32 orderHash = getOrderHash(order);

    LibNativeOrdersStorage.Storage storage stor = LibNativeOrdersStorage.getStorage();

    stor.orders[orderHash] = order;
    emit CreateOrder(msg.sender, orderHash, order);
  }

  function fillOrder(LibNativeOrder.Order memory _order) public payable {
    LibNativeOrder.Order memory order = getOrder(_order);

    require(msg.value >= order.basePrice, "Not enough money");

    IERC721(order.token).safeTransferFrom(order.maker, msg.sender, order.tokenId);
    payable(order.maker).transfer(order.basePrice);

    removeOrder(order);
  }

  function getOrder(LibNativeOrder.Order memory _order) public view returns (LibNativeOrder.Order memory order) {
    bytes32 orderHash = getOrderHash(_order);

    LibNativeOrdersStorage.Storage storage stor = LibNativeOrdersStorage.getStorage();

    return stor.orders[orderHash];
  }

  function getOrderFromHash(bytes32 _orderHash) public view returns (LibNativeOrder.Order memory order) {
    LibNativeOrdersStorage.Storage storage stor = LibNativeOrdersStorage.getStorage();

    return stor.orders[_orderHash];
  }

  function getOrderHash(LibNativeOrder.Order memory order) public pure returns (bytes32 orderHash) {
    // TODO implement EIP712
    return LibNativeOrder.getOrderStructHash(order);
  }

  function removeOrder(LibNativeOrder.Order memory _order) public {
    bytes32 orderHash = getOrderHash(_order);

    address tokenOwner = IERC721(_order.token).ownerOf(_order.tokenId);

    require(_order.maker == msg.sender || tokenOwner == msg.sender, "Only owner has be remove order");

    LibNativeOrdersStorage.Storage storage stor = LibNativeOrdersStorage.getStorage();

    delete stor.orders[orderHash];
  }
}
