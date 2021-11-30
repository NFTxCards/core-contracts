// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface IERC721Royalties is IERC721 {
    function getRoyalty(uint256 tokenId) external view returns (address receiver, uint256 value);
}
