// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "../ERC721Permit.sol";
import "../ERC721Royalties.sol";
import "../ERC721Mintable.sol";

contract ERC721TokenMock is ERC721Permit, ERC721Royalties, ERC721Mintable {
    constructor(address minter, uint256 royaltyValue)
        ERC721A("Mock Token", "MOCK", type(uint256).max)
        ERC721Mintable(minter)
    {
        _setRoyaltyValue(royaltyValue);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Permit, ERC721Royalties, ERC721A)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _safeMint(address to, uint256 quantity) internal override(ERC721Royalties, ERC721A) {
        super._safeMint(to, quantity);
    }
}
