// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract Market {
    using SafeERC20 for IERC20;

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

    /// @notice Bid action hash for EIP712
    bytes32 private constant BID_TYPEHASH =
        keccak256(
            "Bid(address currency,uint256 amount,address bidder,address token,uint256 tokenId,uint64 expiry,uint8 nonce)"
        );

    struct Bid {
        IERC20 currency;
        uint256 amount;
        address bidder;
        IERC721 token;
        uint256 tokenId;
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

    /// @notice Event emitted when some bid is cancelled
    event BidCancelled(Bid bid);

    /// @notice Event emitted when some bid is accepted
    event BidAccepted(Bid bid, address acceptor);

    // PUBLIC FUNCTIONS

    /**
     * @notice Function is used to cancel a bid
     * @param bid Bid object describing bid
     */
    function cancelBid(Bid memory bid) external {
        require(bid.bidder == msg.sender, "Market: can not cancel other bidder");

        bytes32 bidHash = keccak256(abi.encode(bid));
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        bidStates[bidHash] = BidState.Cancelled;

        emit BidCancelled(bid);
    }

    /**
     * @notice Function is used to accept a bid signed off-chain
     * @param bid Bid object describing bid
     * @param v V component of the signature
     * @param r R component of the signature
     * @param s S component of the signature
     */
    function acceptBid(
        Bid memory bid,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        require(bid.amount > 0, "Market: can not accept bid of 0");
        require(bid.expiry > block.timestamp, "Market: bid expired");

        bytes32 bidHash = keccak256(abi.encode(bid));
        require(bidStates[bidHash] == BidState.None, "Market: bid cancelled or executed");

        _checkSignature(bid, v, r, s);

        bidStates[bidHash] = BidState.Accepted;
        bid.currency.safeTransferFrom(bid.bidder, msg.sender, bid.amount);
        bid.token.safeTransferFrom(msg.sender, bid.bidder, bid.tokenId);

        emit BidAccepted(bid, msg.sender);
    }

    // PRIVATE FUNCTIONS

    /**
     * @notice Internal function that checks signature against given bid
     * @param bid Bid object describing bid
     * @param v V component of the signature
     * @param r R component of the signature
     * @param s S component of the signature
     */
    function _checkSignature(
        Bid memory bid,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) private view {
        bytes32 domainSeparator = keccak256(
            abi.encode(
                EIP712_DOMAIN_TYPEHASH,
                NAME_HASH,
                VERSION_HASH,
                _getChainId(),
                address(this)
            )
        );
        bytes32 hashStruct = keccak256(
            abi.encode(
                BID_TYPEHASH,
                bid.currency,
                bid.amount,
                bid.bidder,
                bid.token,
                bid.tokenId,
                bid.expiry,
                bid.nonce
            )
        );

        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, hashStruct));
        address signer = ecrecover(digest, v, r, s);
        require(signer == bid.bidder, "Market: invalid signature");
    }

    /**
     * @notice Internal function that gets chain id
     * @return Chain id
     */
    function _getChainId() private view returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
