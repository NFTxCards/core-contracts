// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./ERC721A.sol";
import "../interfaces/IERC721Royalties.sol";

abstract contract ERC721Royalties is ERC721A {
    uint256 public constant MAX_ROYALTY_VALUE = 2000;

    mapping(uint256 => address) private _royaltyReceivers;

    uint256 public royaltyValue;

    bool public immutable changeReceiverAtTransfer;

    // CONSTRUCTOR

    constructor(uint256 royaltyValue_, bool changeReceiverAtTransfer_) {
        _setRoyaltyValue(royaltyValue_);
        changeReceiverAtTransfer = changeReceiverAtTransfer_;
    }

    // PUBLIC FUNCTIONS

    function getRoyalty(uint256 tokenId) external view returns (address receiver, uint256 value) {
        receiver = receiverOf(tokenId);
        value = royaltyValue;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC721Royalties).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // INTERNAL

    function _safeMint(address to, uint256 quantity) internal virtual override {
        _royaltyReceivers[currentIndex] = msg.sender;
        super._safeMint(to, quantity);
    }

    function _transfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override {
        super._transfer(from, to, tokenId);
        if (changeReceiverAtTransfer) {
            _setRoyaltyReceiver(tokenId, from);
        }
    }

    function _setRoyaltyReceiver(uint256 tokenId, address receiver) internal {
        require(_exists(tokenId), "ERC721Royalties: set royalty receiver for nonexistent token");

        address prevReceiver = receiverOf(tokenId);
        if (prevReceiver != receiver) {
            _royaltyReceivers[tokenId] = receiver;
        }
        uint256 nextTokenId = tokenId + 1;
        if (_exists(nextTokenId) && _royaltyReceivers[nextTokenId] == address(0)) {
            _royaltyReceivers[nextTokenId] = prevReceiver;
        }
    }

    function _setRoyaltyValue(uint256 value) internal {
        require(value < MAX_ROYALTY_VALUE, "ERC721Royalties: invalid royalty value");

        royaltyValue = value;
    }

    // INTERNAL VIEW

    function receiverOf(uint256 tokenId) internal view returns (address) {
        require(_exists(tokenId), "ERC721Royalties: royalty receiver query for nonexistent token");

        uint256 lowestTokenToCheck;
        if (tokenId >= maxBatchSize) {
            lowestTokenToCheck = tokenId - maxBatchSize + 1;
        }

        for (uint256 curr = tokenId + 1; curr >= lowestTokenToCheck + 1; curr--) {
            if (_royaltyReceivers[curr - 1] != address(0)) {
                return _royaltyReceivers[curr - 1];
            }
        }

        return address(0);
    }
}
