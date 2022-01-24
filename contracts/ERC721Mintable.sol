// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC721A.sol";

abstract contract ERC721Mintable is ERC721A {
    address public minter;

    constructor(address minter_) {
        minter = minter_;
    }

    function mint(address to, uint256 quantity) external onlyMinter {
        _safeMint(to, quantity);
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Caller is not minter");
        _;
    }
}
