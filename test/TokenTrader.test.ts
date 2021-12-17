import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC1155TokenMock, ERC721TokenMock, TokenTrader } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { parseUnits } = ethers.utils;

const AssetType = {
    ERC20: 0,
    ERC721: 1,
    ERC1155: 2,
    ETH: 3,
};

describe("Test TokenTrader contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let trader: TokenTrader;

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        const TokenTraderFactory = await ethers.getContractFactory("TokenTrader");
        trader = (await TokenTraderFactory.deploy()) as TokenTrader;
    });

    describe("Buying ERC721", async function () {
        let nft: ERC721TokenMock;

        this.beforeEach(async function () {
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            nft = (await ERC721TokenMockFactory.deploy(trader.address, 0)) as ERC721TokenMock;

            await trader.setTradeInfo(nft.address, true, parseUnits("1"));
        });

        it("Can't buy with unsuficcient message value", async function () {
            await expect(
                trader.buy({ assetType: AssetType.ERC721, token: nft.address, id: 1, amount: 1 }),
            ).to.be.revertedWith("TokenTrader: message value too low");
        });

        it("Can't buy on disabled contract", async function () {
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            const nft2 = (await ERC721TokenMockFactory.deploy(
                trader.address,
                0,
            )) as ERC721TokenMock;

            await expect(
                trader.buy(
                    { assetType: AssetType.ERC721, token: nft2.address, id: 1, amount: 1 },
                    { value: parseUnits("1") },
                ),
            ).to.be.revertedWith("TokenTrader: token sale not enabled");
        });

        it("Can't buy invalid asset", async function () {
            await expect(
                trader.buy({ assetType: AssetType.ERC20, token: nft.address, id: 1, amount: 1 }),
            ).to.be.revertedWith("TokenTrader: unsupported asset type");
        });

        it("Can buy ERC721 with correct arguments", async function () {
            await expect(
                trader.buy(
                    { assetType: AssetType.ERC721, token: nft.address, id: 1, amount: 1 },
                    { value: parseUnits("1") },
                ),
            ).to.emit(trader, "TokenBought");

            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await ethers.provider.getBalance(trader.address)).to.equal(parseUnits("1"));
        });

        it("Owner and only owner can withdraw", async function () {
            await trader.buy(
                { assetType: AssetType.ERC721, token: nft.address, id: 1, amount: 1 },
                { value: parseUnits("1") },
            );

            await expect(trader.connect(other).withdraw()).to.be.revertedWith(
                "Ownable: caller is not the owner",
            );

            await trader.withdraw();
            expect(await ethers.provider.getBalance(trader.address)).to.equal(0);
        });

        it("Owner and only owner can set trade info", async function () {
            await expect(
                trader.connect(other).setTradeInfo(nft.address, false, 0),
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await trader.setTradeInfo(nft.address, false, 0);
            const info = await trader.tradeInfo(nft.address);
            expect(info.enabled).to.be.false;
            expect(info.price).to.equal(0);
        });
    });

    describe("Buying ERC721", async function () {
        let multiToken: ERC1155TokenMock;

        this.beforeEach(async function () {
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy(trader.address)) as ERC1155TokenMock;

            await trader.setTradeInfo(multiToken.address, true, parseUnits("1"));
        });

        it("Can't buy with unsuficcient message value", async function () {
            await expect(
                trader.buy(
                    {
                        assetType: AssetType.ERC1155,
                        token: multiToken.address,
                        id: 1,
                        amount: 5,
                    },
                    { value: parseUnits("4") },
                ),
            ).to.be.revertedWith("TokenTrader: message value too low");
        });

        it("Can buy with correct arguments", async function () {
            await expect(
                trader.buy(
                    {
                        assetType: AssetType.ERC1155,
                        token: multiToken.address,
                        id: 1,
                        amount: 5,
                    },
                    { value: parseUnits("5") },
                ),
            ).to.emit(trader, "TokenBought");
        });
    });
});
