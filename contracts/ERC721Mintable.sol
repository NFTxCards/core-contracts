// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

abstract contract ERC721Mintable is ERC721 {
    address public minter;

    constructor(address minter_) {
        minter = minter_;
    }

    function mint(address to, uint256 tokenId) external onlyMinter {
        _mint(to, tokenId);
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Caller is not minter");
        _;
    }
}
