// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.7.0;
pragma abicoder v2;

import "hardhat/console.sol";

import "@openzeppelin/contracts/cryptography/ECDSA.sol";

contract Verifier {

  string private constant EIP712_DOMAIN = "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";

  string private constant APPLICATION_VERSION = "1";
  string private constant APPLICATION_NAME = "NFTxCards";

  function verify(
    uint8 v,
    bytes32 r,
    bytes32 s,
    address sender,
    uint256 deadline
  ) public {
    require(block.timestamp < deadline, "signed transaction expired");

    bytes32 hash = keccak256(abi.encodePacked(uint16(0x1901), hashDomain(), hashVerify(sender, deadline)));
    address signer = ECDSA.recover(hash, v, r, s);

    require(signer == sender, "verify invalid signature");
  }

  function hashVerify(address sender, uint256 deadline) private pure returns (bytes32) {
    return keccak256(
      abi.encode(
        keccak256("verify(address sender,uint deadline)"),
        sender,
        deadline
      )
    );
  }

  function hashDomain() private view returns (bytes32) {
    uint chainId;

    assembly {
      chainId := chainid()
    }

    return keccak256(
      abi.encode(
        keccak256(bytes(EIP712_DOMAIN)),
        keccak256(bytes(APPLICATION_NAME)),
        keccak256(bytes(APPLICATION_VERSION)),
        chainId,
        address(this)
      )
    );
  }
}
