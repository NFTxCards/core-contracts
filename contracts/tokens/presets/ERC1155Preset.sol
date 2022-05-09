// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../ERC1155Permit.sol";
import "../ERC1155Mintable.sol";

contract ERC1155Preset is ERC1155Permit, ERC1155Mintable {
    constructor(string memory uri, address minter) ERC1155(uri) ERC1155Mintable(minter) {}

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC1155Permit, ERC1155)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
