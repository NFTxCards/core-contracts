// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

library LibSig {
    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    function checkSig(
        Signature memory sig,
        bytes32 dataHash,
        address account
    ) internal pure {
        address signer = ECDSA.recover(dataHash, sig.v, sig.r, sig.s);
        require(signer == account, "LibSignature: invalid signature");
    }
}
