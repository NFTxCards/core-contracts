// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

abstract contract ERC721TokenPermit is ERC721 {
    mapping(address => uint256) private _nonces;

    bytes32 private constant _PERMIT_TYPEHASH =
        keccak256(
            "Permit(address owner,address spender,uint256 tokenId,uint256 deadline,uint256 nonce)"
        );

    string private constant EIP712_DOMAIN =
        "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)";

    string private constant APPLICATION_VERSION = "1";
    string private constant APPLICATION_NAME = "BASEToken";

    function permit(
        uint8 v,
        bytes32 r,
        bytes32 s,
        address owner,
        address spender,
        uint256 tokenId,
        uint256 deadline
    ) public {
        require(block.timestamp < deadline, "expired deadline");

        bytes32 hashStruct = keccak256(
            abi.encode(_PERMIT_TYPEHASH, owner, spender, tokenId, deadline, _nonces[owner])
        );

        bytes32 hash = keccak256(abi.encodePacked(uint16(0x1901), hashDomain(), hashStruct));
        address signer = ECDSA.recover(hash, v, r, s);

        require(signer == owner, "verify invalid signature");

        _nonces[signer]++;
        _approve(spender, tokenId);
    }

    function hashDomain() private view returns (bytes32) {
        uint256 chainId;

        assembly {
            chainId := chainid()
        }

        return
            keccak256(
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
