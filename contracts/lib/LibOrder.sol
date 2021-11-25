// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LibAsset.sol";

library LibOrder {
    using LibAsset for LibAsset.Asset;

    /// @notice Order hash for EIP712
    bytes32 private constant ORDER_TYPEHASH =
        keccak256(
            "Order(address account,Asset commodity,Asset payment,uint64 expiry,uint8 nonce)Asset(address token,uint256 id,uint256 amount)"
        );

    enum OrderSide {
        Buy,
        Sell
    }

    struct Order {
        address account;
        OrderSide side;
        LibAsset.Asset commodity;
        LibAsset.Asset payment;
        uint64 expiry;
        uint8 nonce;
        bytes permitSig;
        LibSig.Signature orderSig;
    }

    function hashOrder(Order memory order) internal pure returns (bytes32) {
        return
            keccak256(
                abi.encode(
                    ORDER_TYPEHASH,
                    order.account,
                    order.commodity.hashAsset(),
                    order.commodity.hashAsset(),
                    order.expiry,
                    order.nonce
                )
            );
    }

    function matchOrder(
        Order memory order,
        address taker,
        bytes memory takerPermitSig
    ) internal {
        require(order.commodity.isCommodity(), "LibOrder: commodity is not correct");
        require(order.payment.isPayment(), "LibOrder: payment is not correct");
        require(block.timestamp < order.expiry, "LibOrder: order expired");
        LibSig.checkSig(order.orderSig, hashOrder(order), order.account);

        if (order.side == OrderSide.Buy) {
            order.payment.permitTransfer(order.permitSig, order.account, taker);
            order.commodity.permitTransfer(takerPermitSig, taker, order.account);
        } else {
            order.payment.permitTransfer(takerPermitSig, taker, order.account);
            order.commodity.permitTransfer(order.permitSig, order.account, taker);
        }
    }
}
