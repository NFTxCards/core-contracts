// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract ERC1155TokenMock is ERC1155 {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;

    mapping(address => bool) blacklist;

    constructor() ERC1155("Mock 1155 Token") {
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

    //address,address,uint256,uint256,bytes
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
}
