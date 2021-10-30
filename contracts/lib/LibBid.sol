pragma solidity ^0.7.0;

library LibBid {
  enum BidStatus {
    INVALID,
    FILLABLE,
    FILLED,
    CANCELLED,
    EXPIRED
  }

  struct Bid {
    uint256 amount;
    address currency;
    address bidder;
    address token;
    uint64 expiry;
  }
}
