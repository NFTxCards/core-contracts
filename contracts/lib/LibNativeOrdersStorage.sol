pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;

import "./LibStorage.sol";
import "./LibNativeOrder.sol";

/// @dev Storage helpers for `NativeOrdersFeature`.
library LibNativeOrdersStorage {

  /// @dev Storage bucket for this feature.
  struct Storage {
    // How much taker token has been filled in order.
    // The lower `uint128` is the taker token fill amount.
    // The high bit will be `1` if the order was directly cancelled.
    mapping (bytes32 => LibNativeOrder.Order) orders;
  }

  /// @dev Get the storage bucket for this contract.
  function getStorage() internal pure returns (Storage storage stor) {
    uint256 storageSlot = LibStorage.getStorageSlot(
      LibStorage.StorageId.NativeOrders
    );
    // Dip into assembly to change the slot pointed to by the local
    // variable `stor`.
    // See https://solidity.readthedocs.io/en/v0.6.8/assembly.html?highlight=slot#access-to-external-variables-functions-and-libraries
    assembly { stor.slot := storageSlot }
  }
}