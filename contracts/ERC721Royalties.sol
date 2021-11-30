// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "./interfaces/IERC721Royalties.sol";

abstract contract ERC721Royalties is ERC721 {
    mapping(uint256 => address) private _royaltyReceivers;

    uint256 public royaltyValue;

    function getRoyalty(uint256 tokenId) external view returns (address receiver, uint256 value) {
        require(_exists(tokenId), "ERC721Royalties: royalty query for nonexistent token");

        receiver = _royaltyReceivers[tokenId];
        value = royaltyValue;
    }

    function _setRoyaltyReceiver(uint256 tokenId, address receiver) internal {
        require(_exists(tokenId), "ERC721Royalties: set royalty receiver for nonexistent token");

        _royaltyReceivers[tokenId] = receiver;
    }

    function _setRoyaltyValue(uint256 value) internal {
        require(value < 5000, "ERC721Royalties: invalid royalty value");

        royaltyValue = value;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC721Royalties).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
