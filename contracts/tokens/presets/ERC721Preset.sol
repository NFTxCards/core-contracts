// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "../ERC721Permit.sol";
import "../ERC721Royalties.sol";
import "../ERC721Mintable.sol";
import "../ERC721URI.sol";

contract ERC721Preset is ERC721Permit, ERC721URI, ERC721Royalties, ERC721Mintable {
    constructor(
        string memory name,
        string memory symbol,
        string memory baseURI,
        address minter,
        uint256 royaltyValue,
        bool changeReceiverAtTransfer
    )
        ERC721A(name, symbol, type(uint256).max)
        ERC721URI(baseURI)
        ERC721Mintable(minter)
        ERC721Royalties(royaltyValue, changeReceiverAtTransfer)
    {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Permit, ERC721Royalties, ERC721A)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _mint(address to, uint256 quantity) internal override(ERC721Royalties, ERC721A) {
        super._mint(to, quantity);
    }

    function _baseURI() internal view override(ERC721URI, ERC721A) returns (string memory) {
        return super._baseURI();
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal override(ERC721Royalties, ERC721A) {
        super._transfer(from, to, tokenId);
    }
}
