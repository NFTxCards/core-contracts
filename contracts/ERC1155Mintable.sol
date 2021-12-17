// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

abstract contract ERC1155Mintable is ERC1155 {
    address public minter;

    constructor(address minter_) {
        minter = minter_;
    }

    function mint(
        address to,
        uint256 id,
        uint256 amount
    ) external onlyMinter {
        _mint(to, id, amount, "");
    }

    modifier onlyMinter() {
        require(msg.sender == minter, "Caller is not minter");
        _;
    }
}
