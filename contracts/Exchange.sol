// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./lib/LibOrder.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Permit.sol";
import "./interfaces/IERC1155Permit.sol";

contract Exchange {
    using LibOrder for LibOrder.Order;

    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    bytes32 private constant VERSION_HASH = keccak256("1");

    bytes32 private constant NAME_HASH = keccak256("Exchange");

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

        bytes32 digest = keccak256(abi.encodePacked(uint16(0x1901), domainHash(), orderHash));
        LibSig.checkSig(order.orderSig, digest, order.account);

        orderStates[orderHash] = OrderState.Executed;
        order.matchOrder(msg.sender, permitSig);
        emit OrderMatch(order, msg.sender);
    }

    // VIEW FUNCTIONS

    function domainHash() public view returns (bytes32) {
        uint256 chainId;

        assembly {
            chainId := chainid()
        }

        return
            keccak256(
                abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, chainId, address(this))
            );
    }
}
