// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./lib/PermitTransfer.sol";
import "./interfaces/IERC721Permit.sol";
import "./interfaces/IERC1155Permit.sol";
import "./interfaces/IERC20Permit.sol";

contract Market {
    using PermitTransfer for IERC20Permit;
    using PermitTransfer for IERC721Permit;
    using PermitTransfer for IERC1155Permit;

    /// @notice Contract name
    string public constant NAME = "NFTxCards Market";

    /// @notice Contract version
    string public constant VERSION = "1";

    /// @notice Name hash for EIP712
    bytes32 private constant NAME_HASH = keccak256("NFTxCards Market");

    /// @notice Version hash for EIP712
    bytes32 private constant VERSION_HASH = keccak256("1");

    /// @notice Contract domain hash for EIP712
    bytes32 private constant EIP712_DOMAIN_TYPEHASH =
        keccak256(
            "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
        );

    /// @notice Bid for ERC721 action hash for EIP712
    bytes32 private constant BID_ERC721_TYPEHASH =
        keccak256(
            "BidERC721(address currency,uint256 amount,address bidder,address token,uint256 tokenId,uint64 expiry,uint8 nonce)"
        );

    /// @notice Bid for ERC1155 action hash for EIP712
    bytes32 private constant BID_ERC1155_TYPEHASH =
        keccak256(
            "BidERC1155(address currency,uint256 currencyAmount,address bidder,address token,uint256 typeId,uint256 tokenAmount,uint64 expiry,uint8 nonce)"
        );

    struct BidERC721 {
        IERC20Permit currency;
        uint256 amount;
        address bidder;
        IERC721Permit token;
        uint256 tokenId;
        uint64 expiry;
        uint8 nonce;
    }

    struct BidERC1155 {
        IERC20Permit currency;
        uint256 currencyAmount;
        address bidder;
        IERC1155Permit token;
        uint256 typeId;
        uint256 tokenAmount;
        uint64 expiry;
        uint8 nonce;
    }

    enum BidState {
        None,
        Cancelled,
        Accepted
    }

    /// @notice Mapping of bid hashes to their states
    mapping(bytes32 => BidState) public bidStates;

    // EVENTS

    /// @notice Event emitted when some bid for ERC721 is cancelled
    event BidERC721Cancelled(BidERC721 bid);

    /// @notice Event emitted when some bid for ERC721 is accepted
    event BidERC721Accepted(BidERC721 bid, address acceptor);

    /// @notice Event emitted when some bid for ERC1155 is cancelled
    event BidERC1155Cancelled(BidERC1155 bid);

    /// @notice Event emitted when some bid for ERC1155 is accepted
    event BidERC1155Accepted(BidERC1155 bid, address acceptor);

    // PUBLIC FUNCTIONS

    /**
     * @notice Function is used to cancel a bid for ERC721
     * @param bid BidERC721 object describing bid
     */
    function cancelBidERC721(BidERC721 memory bid) external {
        require(bid.bidder == msg.sender, "Market: can not cancel other bidder");

        bytes32 bidHash = _hashBidERC721(bid);
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        bidStates[bidHash] = BidState.Cancelled;

        emit BidERC721Cancelled(bid);
    }

    /**
     * @notice Function is used to cancel a bid for ERC1155
     * @param bid BidERC1155 object describing bid
     */
    function cancelBidERC1155(BidERC1155 memory bid) external {
        require(bid.bidder == msg.sender, "Market: can not cancel other bidder");

        bytes32 bidHash = _hashBidERC1155(bid);
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        bidStates[bidHash] = BidState.Cancelled;

        emit BidERC1155Cancelled(bid);
    }

    /**
     * @notice Function is used to accept a bid for ERC721 signed off-chain
     * @param bid BidERC721 object describing bid
     * @param bidSig Signature object describing bid signature
     * @param currencySig SignatureERC20 object desribing existance of currency signature and it's content
     * @param tokenSig SignatureERC721 object desribing existance of token signature and it's content
     */
    function acceptBidERC721(
        BidERC721 calldata bid,
        PermitTransfer.Signature calldata bidSig,
        PermitTransfer.SignatureERC20 calldata currencySig,
        PermitTransfer.SignatureERC721 calldata tokenSig
    ) external {
        require(bid.amount > 0, "Market: can not accept bid of 0");
        require(bid.expiry > block.timestamp, "Market: bid expired");

        bytes32 bidHash = _checkSignatureERC721(bid, bidSig);
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        bidStates[bidHash] = BidState.Accepted;
        bid.currency.permitTransfer(bid.bidder, msg.sender, bid.amount, currencySig);
        bid.token.permitTransfer(msg.sender, bid.bidder, bid.tokenId, tokenSig);

        emit BidERC721Accepted(bid, msg.sender);
    }

    /**
     * @notice Function is used to accept a bid for ERC1155 signed off-chain
     * @param bid BidERC1155 object describing bid
     * @param bidSig Signature object describing bid signature
     * @param currencySig SignatureERC20 object desribing existance of currency signature and it's content
     * @param tokenSig SignatureERC1155 object desribing existance of token signature and it's content
     */
    function acceptBidERC1155(
        BidERC1155 calldata bid,
        PermitTransfer.Signature calldata bidSig,
        PermitTransfer.SignatureERC20 calldata currencySig,
        PermitTransfer.SignatureERC1155 calldata tokenSig
    ) external {
        require(bid.currencyAmount > 0, "Market: can not accept bid of 0");
        require(bid.expiry > block.timestamp, "Market: bid expired");

        bytes32 bidHash = _checkSignatureERC1155(bid, bidSig);
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        bidStates[bidHash] = BidState.Accepted;
        bid.currency.permitTransfer(bid.bidder, msg.sender, bid.currencyAmount, currencySig);
        bid.token.permitTransfer(msg.sender, bid.bidder, bid.typeId, bid.tokenAmount, tokenSig);

        emit BidERC1155Accepted(bid, msg.sender);
    }

    // PRIVATE FUNCTIONS

    /**
     * @notice Internal function that checks signature against given bid for ERC721
     * @param bid BidERC721 object describing bid
     * @param sig Signature object describing signature
     * @return digest EIP712 hash of the bid
     */
    function _checkSignatureERC721(BidERC721 memory bid, PermitTransfer.Signature memory sig)
        private
        view
        returns (bytes32 digest)
    {
        digest = _hashBidERC721(bid);
        address signer = ECDSA.recover(digest, sig.v, sig.r, sig.s);
        require(signer == bid.bidder, "Market: invalid signature");
    }

    /**
     * @notice Internal function that calculates EIP712 hash for a given bid for ERC721
     * @param bid BidERC721 object describing bid
     * @return EIP712 hash
     */
    function _hashBidERC721(BidERC721 memory bid) private view returns (bytes32) {
        bytes32 hashStruct = keccak256(
            abi.encode(
                BID_ERC721_TYPEHASH,
                bid.currency,
                bid.amount,
                bid.bidder,
                bid.token,
                bid.tokenId,
                bid.expiry,
                bid.nonce
            )
        );
        return keccak256(abi.encodePacked(uint16(0x1901), _hashDomain(), hashStruct));
    }

    /**
     * @notice Internal function that checks signature against given bid for ERC1155
     * @param bid BidERC1155 object describing bid
     * @param sig Signature object describing signature
     * @return digest EIP712 hash of the bid
     */
    function _checkSignatureERC1155(BidERC1155 memory bid, PermitTransfer.Signature memory sig)
        private
        view
        returns (bytes32 digest)
    {
        digest = _hashBidERC1155(bid);
        address signer = ECDSA.recover(digest, sig.v, sig.r, sig.s);
        require(signer == bid.bidder, "Market: invalid signature");
    }

    /**
     * @notice Internal function that calculates EIP712 hash for a given bid for ERC1155
     * @param bid BidERC1155 object describing bid
     * @return EIP712 hash
     */
    function _hashBidERC1155(BidERC1155 memory bid) private view returns (bytes32) {
        bytes32 hashStruct = keccak256(
            abi.encode(
                BID_ERC1155_TYPEHASH,
                bid.currency,
                bid.currencyAmount,
                bid.bidder,
                bid.token,
                bid.typeId,
                bid.tokenAmount,
                bid.expiry,
                bid.nonce
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
}
