// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/Counters.sol";
import "../ERC721Permit.sol";
import "../ERC721Royalties.sol";

contract ERC721TokenMock is ERC721Permit, ERC721Royalties {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(address => bool) blacklist;

    constructor(uint256 royaltyValue) ERC721("Mock Token", "MOCK") {
        blacklist[0x0000000000000000000000000000000000000001] = true;
        _setRoyaltyValue(royaltyValue);
    }

    function multipleAwardItem(address player, uint256 tokenMint) public {
        for (uint256 i = 0; i < tokenMint; i++) {
            _tokenIds.increment();

            uint256 newItemId = _tokenIds.current();
            _mint(player, newItemId);
            _setRoyaltyReceiver(newItemId, player);
        }
    }

    function transferFrom(
        address from,
        address to,
        uint256 tokenId
    ) public override {
        require(!blacklist[to], "this address is in the blacklist");
        super.transferFrom(from, to, tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Permit, ERC721Royalties)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
