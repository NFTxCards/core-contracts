pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./LibStorage.sol";
import "./LibBid.sol";

/// @dev Storage helpers for `NativeOrdersFeature`.
library LibBidsStorage {

  /// @dev Storage bucket for this feature.
  struct Storage {
    // Mapping from token to mapping from bidder to bid
    mapping(uint256 => mapping(address => LibBid.Bid)) tokenBidders;
  }

  /// @dev Get the storage bucket for this contract.
  function getStorage() internal pure returns (Storage storage stor) {
    uint256 storageSlot = LibStorage.getStorageSlot(
      LibStorage.StorageId.Bids
    );
    // Dip into assembly to change the slot pointed to by the local
    // variable `stor`.
    // See https://solidity.readthedocs.io/en/v0.6.8/assembly.html?highlight=slot#access-to-external-variables-functions-and-libraries
    assembly { stor.slot := storageSlot }
  }
}
