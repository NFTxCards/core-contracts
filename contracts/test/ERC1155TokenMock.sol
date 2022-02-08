// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../tokens/ERC1155Permit.sol";
import "../tokens/ERC1155Mintable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC1155TokenMock is ERC1155Permit, ERC1155Mintable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(address => bool) blacklist;

    constructor(address minter) ERC1155("Mock 1155 Token") ERC1155Mintable(minter) {
        blacklist[0x0000000000000000000000000000000000000001] = true;
    }

    function multipleAwardItem(
        address player,
        uint256 tokenMint,
        uint256 tokenAmount
    ) public {
        for (uint256 i = 0; i < tokenMint; i++) {
            _tokenIds.increment();

            uint256 newItemId = _tokenIds.current();
            _mint(player, newItemId, tokenAmount, "");
        }
    }

    function safeTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        uint256 amount,
        bytes memory data
    ) public override {
        require(!blacklist[to], "this address is in the blacklist");
        super.safeTransferFrom(from, to, tokenId, amount, data);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Permit, ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
