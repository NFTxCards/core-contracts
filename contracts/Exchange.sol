// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./lib/PermitTransfer.sol";
import "./interfaces/IERC20Permit.sol";
import "./interfaces/IERC721Permit.sol";
import "./interfaces/IERC1155Permit.sol";

contract Exchange {
    using PermitTransfer for IERC20Permit;
    using PermitTransfer for IERC721Permit;
    using PermitTransfer for IERC1155Permit;

    /// @notice Contract name
    string public constant NAME = "NFTxCards Exchange";

    /// @notice Contract version
    string public constant VERSION = "1";

    /// @notice Name hash for EIP712
    bytes32 private constant NAME_HASH = keccak256("NFTxCards Exchange");

    /// @notice Version hash for EIP712
    bytes32 private constant VERSION_HASH = keccak256("1");

    /// @notice Contract domain hash for EIP712
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    /// @notice Order for ERC721 action hash for EIP712
    bytes32 private constant ORDER_ERC721_TYPEHASH =
        keccak256(
            "OrderERC721(address token,uint256 tokenId,address maker,address currency,uint256 price,uint64 expiry,uint8 nonce)"
        );

    /// @notice Order action hash for EIP712
    bytes32 private constant ORDER_ERC1155_TYPEHASH =
        keccak256(
            "OrderERC1155(address token,uint256 typeId,uint256 amount,address maker,address currency,uint256 price,uint64 expiry,uint8 nonce)"
        );

    struct OrderERC721 {
        IERC721Permit token;
        uint256 tokenId;
        address maker;
        IERC20Permit currency;
        uint256 price;
        uint64 expiry;
        uint8 nonce;
    }

    struct OrderERC1155 {
        IERC1155Permit token;
        uint256 typeId;
        uint256 amount;
        address maker;
        IERC20Permit currency;
        uint256 price;
        uint64 expiry;
        uint8 nonce;
    }

    enum OrderState {
        None,
        Cancelled,
        Accepted
    }

    /// @notice Mapping of order hashes to their states
    mapping(bytes32 => OrderState) public orderStates;

    // EVENTS

    /// @notice Event emitted when some order for ERC721 is cancelled
    event OrderERC721Cancelled(OrderERC721 order);

    /// @notice Event emitted when some order for ERC721 is accepted
    event OrderERC721Accepted(OrderERC721 order, address acceptor);

    /// @notice Event emitted when some order for ERC1155 is cancelled
    event OrderERC1155Cancelled(OrderERC1155 order);

    /// @notice Event emitted when some order for ERC1155 is accepted
    event OrderERC1155Accepted(OrderERC1155 order, address acceptor);

    // PUBLIC FUNCTIONS

    /**
     * @notice Function is used to cancel a order for ERC721
     * @param order OrderERC721 object describing order
     */
    function cancelOrderERC721(OrderERC721 memory order) external {
        require(order.maker == msg.sender, "Exchange: can not cancel other maker");

        bytes32 orderHash = _hashOrderERC721(order);
        require(orderStates[orderHash] == OrderState.None, "Exchange: order cancelled or executed");

        orderStates[orderHash] = OrderState.Cancelled;

        emit OrderERC721Cancelled(order);
    }

    /**
     * @notice Function is used to cancel a order for ERC1155
     * @param order OrderERC1155 object describing order
     */
    function cancelOrderERC1155(OrderERC1155 memory order) external {
        require(order.maker == msg.sender, "Exchange: can not cancel other maker");

        bytes32 orderHash = _hashOrderERC1155(order);
        require(orderStates[orderHash] == OrderState.None, "Exchange: order cancelled or executed");

        orderStates[orderHash] = OrderState.Cancelled;

        emit OrderERC1155Cancelled(order);
    }

    /**
     * @notice Function is used to accept a order for ERC721 signed off-chain
     * @param order OrderERC721 object describing order
     * @param orderSig Signature object describing order signature
     * @param currencySig SignatureERC20 object desribing existance of currency signature and it's content
     * @param tokenSig SignatureERC721 object desribing existance of token signature and it's content
     */
    function acceptOrderERC721(
        OrderERC721 calldata order,
        PermitTransfer.Signature calldata orderSig,
        PermitTransfer.SignatureERC20 calldata currencySig,
        PermitTransfer.SignatureERC721 calldata tokenSig
    ) external {
        bytes32 orderHash = _checkOrderERC721(order, orderSig);
        orderStates[orderHash] = OrderState.Accepted;

        order.currency.permitTransfer(msg.sender, order.maker, order.price, currencySig);

        order.token.permitTransfer(order.maker, msg.sender, order.tokenId, tokenSig);

        emit OrderERC721Accepted(order, msg.sender);
    }

    /**
     * @notice Function is used to accept a order for ERC721 signed off-chain and pay for it with ETH
     * @param order OrderERC721 object describing order
     * @param orderSig Signature object describing order signature
     * @param tokenSig SignatureERC721 object desribing existance of token signature and it's content
     */
    function acceptETHOrderERC721(
        OrderERC721 calldata order,
        PermitTransfer.Signature calldata orderSig,
        PermitTransfer.SignatureERC721 calldata tokenSig
    ) external payable {
        bytes32 orderHash = _checkOrderERC721(order, orderSig);
        orderStates[orderHash] = OrderState.Accepted;

        require(address(order.currency) == address(0), "Exchange: order currency is not ETH");
        require(msg.value >= order.price, "Exchange: passed value is lower than price");
        payable(order.maker).transfer(msg.value);

        order.token.permitTransfer(order.maker, msg.sender, order.tokenId, tokenSig);

        emit OrderERC721Accepted(order, msg.sender);
    }

    /**
     * @notice Function is used to accept a order for ERC1155 signed off-chain
     * @param order OrderERC1155 object describing order
     * @param orderSig Signature object describing order signature
     * @param currencySig SignatureERC20 object desribing existance of currency signature and it's content
     * @param tokenSig SignatureERC1155 object desribing existance of token signature and it's content
     */
    function acceptOrderERC1155(
        OrderERC1155 calldata order,
        PermitTransfer.Signature calldata orderSig,
        PermitTransfer.SignatureERC20 calldata currencySig,
        PermitTransfer.SignatureERC1155 calldata tokenSig
    ) external {
        bytes32 orderHash = _checkOrderERC1155(order, orderSig);
        orderStates[orderHash] = OrderState.Accepted;

        order.currency.permitTransfer(msg.sender, order.maker, order.price, currencySig);

        order.token.permitTransfer(order.maker, msg.sender, order.typeId, order.amount, tokenSig);

        emit OrderERC1155Accepted(order, msg.sender);
    }

    /**
     * @notice Function is used to accept a order for ERC1155 signed off-chain and pay for it with ETH
     * @param order OrderERC1155 object describing order
     * @param orderSig Signature object describing order signature
     * @param tokenSig SignatureERC1155 object desribing existance of token signature and it's content
     */
    function acceptETHOrderERC1155(
        OrderERC1155 calldata order,
        PermitTransfer.Signature calldata orderSig,
        PermitTransfer.SignatureERC1155 calldata tokenSig
    ) external payable {
        bytes32 orderHash = _checkOrderERC1155(order, orderSig);
        orderStates[orderHash] = OrderState.Accepted;

        require(address(order.currency) == address(0), "Exchange: order currency is not ETH");
        require(msg.value >= order.price, "Exchange: passed value is lower than price");
        payable(order.maker).transfer(msg.value);

        order.token.permitTransfer(order.maker, msg.sender, order.typeId, order.amount, tokenSig);

        emit OrderERC1155Accepted(order, msg.sender);
    }

    // PRIVATE FUNCTIONS

    /**
     * @notice Internal function that checks signature against given order for ERC721 and validates order
     * @param order OrderERC721 object describing order
     * @param sig Signature object describing signature
     * @return digest EIP712 hash of the order
     */
    function _checkOrderERC721(OrderERC721 memory order, PermitTransfer.Signature memory sig)
        private
        view
        returns (bytes32 digest)
    {
        require(order.price > 0, "Exchange: can not accept order of 0");
        require(order.expiry > block.timestamp, "Exchange: order expired");

        digest = _hashOrderERC721(order);
        address signer = ECDSA.recover(digest, sig.v, sig.r, sig.s);
        require(signer == order.maker, "Exchange: invalid signature");
        require(orderStates[digest] == OrderState.None, "Exchange: order cancelled or executed");
    }

    /**
     * @notice Internal function that calculates EIP712 hash for a given order for ERC721
     * @param order OrderERC721 object describing order
     * @return EIP712 hash
     */
    function _hashOrderERC721(OrderERC721 memory order) private view returns (bytes32) {
        bytes32 hashStruct = keccak256(
            abi.encode(
                ORDER_ERC721_TYPEHASH,
                order.token,
                order.tokenId,
                order.maker,
                order.currency,
                order.price,
                order.expiry,
                order.nonce
            )
        );
        return keccak256(abi.encodePacked(uint16(0x1901), _hashDomain(), hashStruct));
    }

    /**
     * @notice Internal function that checks signature against given order for ERC1155 and validates order
     * @param order OrderERC1155 object describing order
     * @param sig Signature object describing signature
     * @return digest EIP712 hash of the order
     */
    function _checkOrderERC1155(OrderERC1155 memory order, PermitTransfer.Signature memory sig)
        private
        view
        returns (bytes32 digest)
    {
        require(order.price > 0, "Exchange: can not accept order of 0");
        require(order.expiry > block.timestamp, "Exchange: order expired");

        digest = _hashOrderERC1155(order);
        address signer = ECDSA.recover(digest, sig.v, sig.r, sig.s);
        require(signer == order.maker, "Exchange: invalid signature");
        require(orderStates[digest] == OrderState.None, "Exchange: order cancelled or executed");
    }

    /**
     * @notice Internal function that calculates EIP712 hash for a given order for ERC1155
     * @param order OrderERC1155 object describing order
     * @return EIP712 hash
     */
    function _hashOrderERC1155(OrderERC1155 memory order) private view returns (bytes32) {
        bytes32 hashStruct = keccak256(
            abi.encode(
                ORDER_ERC1155_TYPEHASH,
                order.token,
                order.typeId,
                order.amount,
                order.maker,
                order.currency,
                order.price,
                order.expiry,
                order.nonce
            )
        );
        return keccak256(abi.encodePacked(uint16(0x1901), _hashDomain(), hashStruct));
    }

    /**
     * @notice Internal function that calculates EIP712 domain separator hash
     * @return Domain separator hash
     */
    function _hashDomain() private view returns (bytes32) {
        uint256 chainId;

        assembly {
            chainId := chainid()
        }

        return
            keccak256(
                abi.encode(EIP712_DOMAIN_TYPEHASH, NAME_HASH, VERSION_HASH, chainId, address(this))
            );
    }

    /*event CreateOrder(address indexed from, bytes32 orderHash, LibOrder.Order order);

    function createOrder(LibOrder.NewOrder memory _order) public {
        // TODO check approve
        require(
            IERC721(_order.token).ownerOf(_order.tokenId) == msg.sender,
            "Only owner token can create order"
        );

        LibOrder.Order memory order = LibOrder.Order({
            maker: msg.sender,
            token: _order.token,
            basePrice: _order.price,
            tokenId: _order.tokenId,
            listingTime: uint64(block.timestamp),
            expiry: _order.expirationTime,
            salt: _order.salt
        });

        bytes32 orderHash = getOrderHash(order);

        LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

        stor.orders[orderHash] = order;
        emit CreateOrder(msg.sender, orderHash, order);
    }

    function fillOrder(LibOrder.Order memory _order) public payable {
        LibOrder.Order memory order = getOrder(_order);

        require(msg.value >= order.basePrice, "Not enough money");

        IERC721(order.token).safeTransferFrom(order.maker, msg.sender, order.tokenId);
        payable(order.maker).transfer(order.basePrice);

        removeOrder(order);
    }

    function getOrder(LibOrder.Order memory _order)
        public
        view
        returns (LibOrder.Order memory order)
    {
        bytes32 orderHash = getOrderHash(_order);

        LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

        return stor.orders[orderHash];
    }

    function getOrderFromHash(bytes32 _orderHash)
        public
        view
        returns (LibOrder.Order memory order)
    {
        LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

        return stor.orders[_orderHash];
    }

    function getOrderHash(LibOrder.Order memory order) public pure returns (bytes32 orderHash) {
        // TODO implement EIP712
        return LibOrder.getOrderStructHash(order);
    }

    function removeOrder(LibOrder.Order memory _order) public {
        bytes32 orderHash = getOrderHash(_order);

        address tokenOwner = IERC721(_order.token).ownerOf(_order.tokenId);

        require(
            _order.maker == msg.sender || tokenOwner == msg.sender,
            "Only owner has be remove order"
        );

        LibOrdersStorage.Storage storage stor = LibOrdersStorage.getStorage();

        delete stor.orders[orderHash];
    }*/
}
