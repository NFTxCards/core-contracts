// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma abicoder v2;

import "hardhat/console.sol";

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "@openzeppelin/contracts/token/ERC20/SafeERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

import "./lib/LibBid.sol";
import "./lib/LibBidsStorage.sol";

contract Market {
  using SafeERC20 for IERC20;
  using SafeMath for uint256;

  event BidCreated(uint256 indexed tokenId, LibBid.Bid bid);
  event BidRemoved(uint256 indexed tokenId, LibBid.Bid bid);
  event BidFinalized(uint256 indexed tokenId, LibBid.Bid bid);

  function createBid(uint256 _tokenId, LibBid.Bid memory _bid, address _spender) public {
    require(_bid.bidder != address(0), "Bidder cannot be 0 address");
    require(_bid.amount != 0, "Cannot bid amount of 0");
    require(_bid.currency != address(0), "Bid currency cannot be 0 address");
    require(_bid.token != address(0), "Bid token cannot be 0 address");
    require(_bid.expiry > block.timestamp, "Bid expiry cannot lower current date");

    LibBidsStorage.Storage storage stor = LibBidsStorage.getStorage();
    LibBid.Bid storage existingBid = stor.tokenBidders[_tokenId][_bid.bidder];

    if (existingBid.amount > 0) {
      removeBid(_tokenId, _bid.bidder);
    }

    IERC20 token = IERC20(_bid.currency);
    require(token.balanceOf(_bid.bidder) >= _bid.amount, "Not enough money");

    uint256 beforeBalance = token.balanceOf(address(this));
    token.safeTransferFrom(_spender, address(this), _bid.amount);
    uint256 afterBalance = token.balanceOf(address(this));

    LibBid.Bid memory bid = LibBid.Bid({
      amount: afterBalance.sub(beforeBalance),
      currency: _bid.currency,
      bidder: _bid.bidder,
      token: _bid.token,
      expiry: _bid.expiry
    });

    stor.tokenBidders[_tokenId][_bid.bidder] = bid;

    emit BidCreated(_tokenId, bid);
  }

  function removeBid(uint256 _tokenId, address _bidder) public {
    LibBidsStorage.Storage storage stor = LibBidsStorage.getStorage();
    LibBid.Bid storage bid = stor.tokenBidders[_tokenId][_bidder];

    require(bid.amount > 0, "Market: cannot remove bid amount of 0");

    IERC20 token = IERC20(bid.currency);

    emit BidRemoved(_tokenId, bid);
    delete stor.tokenBidders[_tokenId][_bidder];
    token.safeTransfer(_bidder, bid.amount);
  }

  function acceptBid(uint256 _tokenId, LibBid.Bid calldata _expectedBid) external {
    LibBidsStorage.Storage storage stor = LibBidsStorage.getStorage();
    LibBid.Bid memory bid = stor.tokenBidders[_tokenId][_expectedBid.bidder];

    require(bid.amount > 0, "Cannot accept bid of 0");
    require(
      bid.token == _expectedBid.token &&
      bid.amount == _expectedBid.amount &&
      bid.currency == _expectedBid.currency &&
      bid.expiry == _expectedBid.expiry,
      "Unexpected bid found."
    );

    IERC20 token = IERC20(bid.currency);

    // Transfer bid share to owner of media
    token.safeTransfer(bid.bidder, bid.amount);

    // Transfer media to bid recipient
    IERC721(bid.token).safeTransferFrom(msg.sender, bid.bidder, _tokenId);

    // Remove the accepted bid
    delete stor.tokenBidders[_tokenId][bid.bidder];
    emit BidFinalized(_tokenId, bid);
  }
}
