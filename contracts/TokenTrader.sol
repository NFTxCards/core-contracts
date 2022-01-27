// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./lib/LibAsset.sol";
import "./interfaces/IERC721Mintable.sol";
import "./interfaces/IERC1155Mintable.sol";

contract TokenTrader is OwnableUpgradeable {
    struct TradeInfo {
        bool enabled;
        uint256 price;
    }

    mapping(address => TradeInfo) public tradeInfo;

    // EVENTS

    event TokenBought(LibAsset.Asset asset);

    // CONSTRUCTOR

    function __TokenTrader_init() public initializer {
        __Ownable_init();
    }

    // PUBLIC FUNCTIONS

    function buy(LibAsset.Asset memory asset) external payable {
        require(tradeInfo[asset.token].enabled, "TokenTrader: token sale not enabled");
        if (asset.assetType == LibAsset.AssetType.ERC721) {
            require(
                msg.value >= tradeInfo[asset.token].price * asset.amount,
                "TokenTrader: message value too low"
            );
            IERC721Mintable(asset.token).mint(msg.sender, asset.amount);
        } else if (asset.assetType == LibAsset.AssetType.ERC1155) {
            require(
                msg.value >= tradeInfo[asset.token].price * asset.amount,
                "TokenTrader: message value too low"
            );
            IERC1155Mintable(asset.token).mint(msg.sender, asset.id, asset.amount);
        } else {
            revert("TokenTrader: unsupported asset type");
        }
        emit TokenBought(asset);
    }

    // RESTRICTED FUNCTIONS

    function setTradeInfo(
        address token,
        bool enabled,
        uint256 price
    ) external onlyOwner {
        tradeInfo[token] = TradeInfo({enabled: enabled, price: price});
    }

    function withdraw() external onlyOwner {
        payable(msg.sender).transfer(payable(address(this)).balance);
    }
}
