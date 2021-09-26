pragma solidity ^0.7.0;
pragma experimental ABIEncoderV2;


/// @dev Common storage helpers
library LibStorage {

  /// @dev What to bit-shift a storage ID by to get its slot.
  ///      This gives us a maximum of 2**128 inline fields in each bucket.
  uint256 private constant STORAGE_SLOT_EXP = 128;

  /// @dev Storage IDs for feature storage buckets.
  ///      WARNING: APPEND-ONLY.
  enum StorageId {
    Ownable,
    NativeOrders
  }

  /// @dev Get the storage slot given a storage ID. We assign unique, well-spaced
  ///     slots to storage bucket variables to ensure they do not overlap.
  ///     See: https://solidity.readthedocs.io/en/v0.6.6/assembly.html#access-to-external-variables-functions-and-libraries
  /// @param storageId An entry in `StorageId`
  /// @return slot The storage slot.
  function getStorageSlot(StorageId storageId)
  internal
  pure
  returns (uint256 slot)
  {
    // This should never overflow with a reasonable `STORAGE_SLOT_EXP`
    // because Solidity will do a range check on `storageId` during the cast.
    return (uint256(storageId) + 1) << STORAGE_SLOT_EXP;
  }
}
