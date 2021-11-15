// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IERC20Permit.sol";
import "../interfaces/IERC721Permit.sol";
import "../interfaces/IERC1155Permit.sol";

library PermitTransfer {
    using SafeERC20 for IERC20Permit;

    struct Signature {
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    struct SignatureERC20 {
        bool exists;
        uint256 amount;
        uint256 deadline;
        Signature sig;
    }

    struct SignatureERC721 {
        bool exists;
        bool forAll;
        uint256 tokenId;
        uint256 deadline;
        Signature sig;
    }

    struct SignatureERC1155 {
        bool exists;
        uint256 deadline;
        Signature sig;
    }

    function permitTransfer(
        IERC20Permit token,
        address from,
        address to,
        uint256 amount,
        SignatureERC20 memory signature
    ) internal {
        if (signature.exists) {
            token.permit(
                from,
                address(this),
                signature.amount,
                signature.deadline,
                signature.sig.v,
                signature.sig.r,
                signature.sig.s
            );
        }
        token.safeTransferFrom(from, to, amount);
    }

    function permitTransfer(
        IERC721Permit token,
        address from,
        address to,
        uint256 tokenId,
        SignatureERC721 memory signature
    ) internal {
        if (signature.exists) {
            if (signature.forAll) {
                token.permitAll(
                    from,
                    address(this),
                    signature.deadline,
                    signature.sig.v,
                    signature.sig.r,
                    signature.sig.s
                );
            } else {
                token.permit(
                    from,
                    address(this),
                    signature.tokenId,
                    signature.deadline,
                    signature.sig.v,
                    signature.sig.r,
                    signature.sig.s
                );
            }
        }
        token.safeTransferFrom(from, to, tokenId);
    }

    function permitTransfer(
        IERC1155Permit token,
        address from,
        address to,
        uint256 typeId,
        uint256 amount,
        SignatureERC1155 memory signature
    ) internal {
        if (signature.exists) {
            token.permit(
                from,
                address(this),
                signature.deadline,
                signature.sig.v,
                signature.sig.r,
                signature.sig.s
            );
        }
        token.safeTransferFrom(from, to, typeId, amount, "");
    }
}
