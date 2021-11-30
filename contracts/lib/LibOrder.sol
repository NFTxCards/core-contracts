// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./LibAsset.sol";

library LibOrder {
    using LibAsset for LibAsset.Asset;

    /// @notice Order hash for EIP712
    bytes32 private constant ORDER_TYPEHASH =
        keccak256(
            "Order(address account,uint8 side,Asset commodity,Asset payment,uint64 expiry,uint8 nonce)Asset(uint8 assetType,address token,uint256 id,uint256 amount)"
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
                    order.side,
                    order.commodity.hashAsset(),
                    order.payment.hashAsset(),
                    order.expiry,
                    order.nonce
                )
            );
    }

    function matchOrder(
        Order memory order,
        address taker,
        bytes memory takerPermitSig,
        address treasury,
        uint256 fee
    ) internal {
        require(order.commodity.isCommodity(), "LibOrder: commodity is not correct");
        require(
            order.payment.isPayment(order.side == OrderSide.Buy),
            "LibOrder: payment is not correct"
        );
        require(block.timestamp < order.expiry, "LibOrder: order expired");

        if (order.side == OrderSide.Buy) {
            transferPayment(
                order.payment,
                order.permitSig,
                order.commodity,
                order.account,
                taker,
                treasury,
                fee
            );
            order.commodity.permitTransfer(takerPermitSig, taker, order.account);
        } else {
            transferPayment(
                order.payment,
                takerPermitSig,
                order.commodity,
                taker,
                order.account,
                treasury,
                fee
            );
            order.commodity.permitTransfer(order.permitSig, order.account, taker);
        }
    }

    function transferPayment(
        LibAsset.Asset memory payment,
        bytes memory paymentSig,
        LibAsset.Asset memory commodity,
        address from,
        address to,
        address treasury,
        uint256 fee
    ) internal {
        if (payment.assetType == LibAsset.AssetType.ETH) {
            require(msg.value == payment.amount, "LibOrder: message value to low");
        } else if (paymentSig.length != 0) {
            payment.permit(paymentSig, from);
        }

        uint256 feeAmount = (payment.amount * fee) / 10000;
        if (feeAmount > 0) {
            payment.withAmount(feeAmount).transfer(from, treasury);
        }

        uint256 royaltyAmount;
        {
            (address receiver, uint256 royalty) = commodity.getRoyalty();
            royaltyAmount = (payment.amount * royalty) / 10000;
            if (royaltyAmount > 0) {
                payment.withAmount(royaltyAmount).transfer(from, receiver);
            }
        }

        payment.withAmount(payment.amount - royaltyAmount - feeAmount).transfer(from, to);
    }
}
