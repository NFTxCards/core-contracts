// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "./lib/LibAsset.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";

contract TokenTrader is OwnableUpgradeable, ReentrancyGuardUpgradeable {
    struct TradeInfo {
        bool enabled;
        uint256 price;
    }

    mapping(address => TradeInfo) public tradeInfoERC721;

    mapping(address => mapping(uint256 => TradeInfo)) public tradeInfoERC1155;

    // EVENTS

    event TokenBought(LibAsset.Asset asset);

    // CONSTRUCTOR

    function __TokenTrader_init() public onlyInitializing {
        __Ownable_init();
    }

    // PUBLIC FUNCTIONS

    function buy(LibAsset.Asset memory asset) external payable nonReentrant {
        if (asset.assetType == LibAsset.AssetType.ERC721) {
            TradeInfo memory info = tradeInfoERC721[asset.token];
            require(info.enabled, "TokenTrader: token sale not enabled");
            require(msg.value == info.price * asset.amount, "TokenTrader: message value too low");
            IERC721Mintable(asset.token).mint(msg.sender, asset.amount);
        } else if (asset.assetType == LibAsset.AssetType.ERC1155) {
            TradeInfo memory info = tradeInfoERC1155[asset.token][asset.id];
            require(info.enabled, "TokenTrader: token sale not enabled");
            require(msg.value == info.price * asset.amount, "TokenTrader: message value too low");
            IERC1155Mintable(asset.token).mint(msg.sender, asset.id, asset.amount);
        } else {
            revert("TokenTrader: unsupported asset type");
        }
        emit TokenBought(asset);
    }

    // RESTRICTED FUNCTIONS

    function setTradeInfoERC721(
        address token,
        bool enabled,
        uint256 price
    ) external onlyOwner {
        tradeInfoERC721[token] = TradeInfo({enabled: enabled, price: price});
    }

    function setTradeInfoERC1155(
        address token,
        uint256 id,
        bool enabled,
        uint256 price
    ) external onlyOwner {
        tradeInfoERC1155[token][id] = TradeInfo({enabled: enabled, price: price});
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(payable(address(this)).balance);
    }
}
