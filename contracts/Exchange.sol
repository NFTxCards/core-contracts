// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./lib/LibOrder.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Permit.sol";
import "./interfaces/IERC1155Permit.sol";

contract Exchange {
    using LibOrder for LibOrder.Order;

    enum OrderState {
        None,
        Cancelled,
        Executed
    }

    /// @notice Mapping of order hashes to their states
    mapping(bytes32 => OrderState) public orderStates;

    // EVENTS

    event OrderCancelled(LibOrder.Order order);

    /// @notice Event emitted when some exchange happens
    event OrderMatch(LibOrder.Order order, address taker);

    // PUBLIC FUNCTIONS

    function cancelOrder(LibOrder.Order memory order) external {
        require(order.account == msg.sender, "Exchange: sender is not order account");
        bytes32 orderHash = order.hashOrder();
        require(orderStates[orderHash] == OrderState.None, "Exchange: order is in wrong state");

        orderStates[orderHash] = OrderState.Cancelled;
        emit OrderCancelled(order);
    }

    function matchOrder(LibOrder.Order memory order, bytes memory permitSig) external {
        bytes32 orderHash = order.hashOrder();
        require(orderStates[orderHash] == OrderState.None, "Exchange: order is in wrong state");

        orderStates[orderHash] = OrderState.Executed;
        order.matchOrder(msg.sender, permitSig);
        emit OrderMatch(order, msg.sender);
    }
}
