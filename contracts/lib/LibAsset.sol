// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IERC20Permit.sol";
import "../interfaces/IERC721Permit.sol";
import "../interfaces/IERC1155Permit.sol";
import "./LibSig.sol";

library LibAsset {
    using SafeERC20 for IERC20Permit;

    /// @notice Order hash for EIP712
    bytes32 private constant ASSET_TYPEHASH =
        keccak256("Asset(address token,uint256 id,uint256 amount)");

    enum AssetType {
        ERC20,
        ERC721,
        ERC1155
    }

    struct Asset {
        AssetType assetType;
        address token;
        uint256 id;
        uint256 amount;
    }

    struct SignatureERC20 {
        uint256 amount;
        uint256 deadline;
        LibSig.Signature sig;
    }

    struct SignatureERC721 {
        bool forAll;
        uint256 tokenId;
        uint256 deadline;
        LibSig.Signature sig;
    }

    struct SignatureERC1155 {
        uint256 deadline;
        LibSig.Signature sig;
    }

    function hashAsset(Asset memory asset) internal pure returns (bytes32) {
        return keccak256(abi.encode(ASSET_TYPEHASH, asset.token, asset.id, asset.amount));
    }

    function isCommodity(Asset memory asset) internal pure returns (bool) {
        return asset.assetType == AssetType.ERC721 || asset.assetType == AssetType.ERC1155;
    }

    function isPayment(Asset memory asset) internal pure returns (bool) {
        return asset.assetType == AssetType.ERC20;
    }

    function permit(
        Asset memory asset,
        bytes memory permitSig,
        address from
    ) internal {
        if (asset.assetType == AssetType.ERC20) {
            SignatureERC20 memory signature = abi.decode(permitSig, (SignatureERC20));
            IERC20Permit(asset.token).permit(
                from,
                address(this),
                signature.amount,
                signature.deadline,
                signature.sig.v,
                signature.sig.r,
                signature.sig.s
            );
        } else if (asset.assetType == AssetType.ERC721) {
            SignatureERC721 memory signature = abi.decode(permitSig, (SignatureERC721));
            if (signature.forAll) {
                IERC721Permit(asset.token).permitAll(
                    from,
                    address(this),
                    signature.deadline,
                    signature.sig.v,
                    signature.sig.r,
                    signature.sig.s
                );
            } else {
                IERC721Permit(asset.token).permit(
                    from,
                    address(this),
                    signature.tokenId,
                    signature.deadline,
                    signature.sig.v,
                    signature.sig.r,
                    signature.sig.s
                );
            }
        } else {
            SignatureERC1155 memory signature = abi.decode(permitSig, (SignatureERC1155));
            IERC1155Permit(asset.token).permit(
                from,
                address(this),
                signature.deadline,
                signature.sig.v,
                signature.sig.r,
                signature.sig.s
            );
        }
    }

    function transfer(
        Asset memory asset,
        address from,
        address to
    ) internal {
        if (asset.assetType == AssetType.ERC20) {
            IERC20Permit(asset.token).safeTransferFrom(from, to, asset.amount);
        } else if (asset.assetType == AssetType.ERC721) {
            IERC721Permit(asset.token).safeTransferFrom(from, to, asset.id);
        } else {
            IERC1155Permit(asset.token).safeTransferFrom(from, to, asset.id, asset.amount, "");
        }
    }

    function permitTransfer(
        Asset memory asset,
        bytes memory permitSig,
        address from,
        address to
    ) internal {
        if (permitSig.length != 0) {
            permit(asset, permitSig, from);
        }
        transfer(asset, from, to);
    }
}