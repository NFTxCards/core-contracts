// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma abicoder v2;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "./lib/LibOrder.sol";
import "./lib/LibOrdersStorage.sol";

contract Exchange {
  event CreateOrder(address indexed from, bytes32 orderHash, LibOrder.Order order);

  function createOrder(LibOrder.NewOrder memory _order) public {
    // TODO check approve
    require(IERC721(_order.token).ownerOf(_order.tokenId) == msg.sender, "Only owner token can create order");

    LibOrder.Order memory order = LibOrder.Order({
      maker: msg.sender,
      token: _order.token,
      basePrice: _order.price,
      tokenId: _order.tokenId,
      listingTime: uint64(block.timestamp),
      expiry: _order.expirationTime,
      salt: _order.salt
    });

    bytes32 orderHash = getOrderHash(order);

    LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

    stor.orders[orderHash] = order;
    emit CreateOrder(msg.sender, orderHash, order);
  }

  function fillOrder(LibOrder.Order memory _order) public payable {
    LibOrder.Order memory order = getOrder(_order);

    require(msg.value >= order.basePrice, "Not enough money");

    IERC721(order.token).safeTransferFrom(order.maker, msg.sender, order.tokenId);
    payable(order.maker).transfer(order.basePrice);

    removeOrder(order);
  }

  function getOrder(LibOrder.Order memory _order) public view returns (LibOrder.Order memory order) {
    bytes32 orderHash = getOrderHash(_order);

    LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

    return stor.orders[orderHash];
  }

  function getOrderFromHash(bytes32 _orderHash) public view returns (LibOrder.Order memory order) {
    LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

    return stor.orders[_orderHash];
  }

  function getOrderHash(LibOrder.Order memory order) public pure returns (bytes32 orderHash) {
    // TODO implement EIP712
    return LibOrder.getOrderStructHash(order);
  }

  function removeOrder(LibOrder.Order memory _order) public {
    bytes32 orderHash = getOrderHash(_order);

    address tokenOwner = IERC721(_order.token).ownerOf(_order.tokenId);

    require(_order.maker == msg.sender || tokenOwner == msg.sender, "Only owner has be remove order");

    LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

    delete stor.orders[orderHash];
  }
}
