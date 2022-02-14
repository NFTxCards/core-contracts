// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../lib/LibOrder.sol";

contract OrderMatcher {
    IExchange public exchange;

    bool public receiveEnabled;

    constructor(IExchange exchange_) {
        exchange = exchange_;
    }

    function approveToken(IERC721 token) external {
        token.setApprovalForAll(address(exchange), true);
    }

    function matchOrder(LibOrder.Order memory order) external {
        bytes memory emptyBytes = new bytes(0);
        exchange.matchOrder(order, emptyBytes);
    }

    function setReceiveEnabled(bool enabled) external {
        receiveEnabled = enabled;
    }

    receive() external payable {
        require(receiveEnabled, "Receiver disabled");
    }
}

interface IExchange {
    function matchOrder(LibOrder.Order memory order, bytes memory permitSig) external payable;
}
