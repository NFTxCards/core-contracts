// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC721A.sol";

abstract contract ERC721Mintable is ERC721A, Ownable {
    address public minter;

    constructor(address minter_) {
        minter = minter_;
    }

    function mint(address to, uint256 quantity) external onlyMinter {
        _mint(to, quantity);
    }

    function setMinter(address minter_) external onlyOwner {
        minter = minter_;
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Caller is not minter");
        _;
    }
}
