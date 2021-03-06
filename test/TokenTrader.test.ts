import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { ERC1155TokenMock, ERC721TokenMock, Exchange } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

const { parseUnits } = ethers.utils;

const AssetType = {
    ERC20: 0,
    ERC721: 1,
    ERC1155: 2,
    ETH: 3,
};

describe("Test TokenTrader functionality", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let trader: Exchange;

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        const ExchangeFactory = await ethers.getContractFactory("Exchange");
        trader = (await upgrades.deployProxy(ExchangeFactory, [owner.address, 0])) as Exchange;
    });

    describe("Buying ERC721", async function () {
        let nft: ERC721TokenMock;

        this.beforeEach(async function () {
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            nft = (await ERC721TokenMockFactory.deploy(trader.address, 0)) as ERC721TokenMock;

            await trader.setTradeInfoERC721(nft.address, true, parseUnits("1"), 5);
        });

        it("Can't buy with unsuficcient message value", async function () {
            await expect(
                trader.buy({ assetType: AssetType.ERC721, token: nft.address, id: 1, amount: 1 }),
            ).to.be.revertedWith("TokenTrader: message value too low");
        });

        it("Can't buy more than remaining", async function () {
            await expect(
                trader.buy(
                    { assetType: AssetType.ERC721, token: nft.address, id: 1, amount: 10 },
                    { value: parseUnits("10") },
                ),
            ).to.be.revertedWith("TokenTrader: remaining amount too low");
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
                    { assetType: AssetType.ERC721, token: nft.address, id: 0, amount: 1 },
                    { value: parseUnits("1") },
                ),
            ).to.emit(trader, "TokenBought");

            expect(await nft.ownerOf(0)).to.equal(owner.address);
            expect(await ethers.provider.getBalance(trader.address)).to.equal(parseUnits("1"));
            const info = await trader.tradeInfoERC721(nft.address);
            expect(info.amount).to.equal(4);
        });

        it("Can buy multiple ERC721 with correct arguments", async function () {
            await expect(
                trader.buy(
                    { assetType: AssetType.ERC721, token: nft.address, id: 0, amount: 2 },
                    { value: parseUnits("2") },
                ),
            ).to.emit(trader, "TokenBought");

            expect(await nft.ownerOf(0)).to.equal(owner.address);
            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await ethers.provider.getBalance(trader.address)).to.equal(parseUnits("2"));
            const info = await trader.tradeInfoERC721(nft.address);
            expect(info.amount).to.equal(3);
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
                trader.connect(other).setTradeInfoERC721(nft.address, false, 0, 1),
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await trader.setTradeInfoERC721(nft.address, false, 0, 1);
            const info = await trader.tradeInfoERC721(nft.address);
            expect(info.enabled).to.be.false;
            expect(info.price).to.equal(0);
            expect(info.amount).to.equal(1);
        });
    });

    describe("Buying ERC1155", async function () {
        let multiToken: ERC1155TokenMock;

        this.beforeEach(async function () {
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy(trader.address)) as ERC1155TokenMock;

            await trader.setTradeInfoERC1155(
                multiToken.address,
                [1],
                [true],
                [parseUnits("1")],
                [10],
            );
        });

        it("Can't buy disabled type", async function () {
            await expect(
                trader.buy(
                    {
                        assetType: AssetType.ERC1155,
                        token: multiToken.address,
                        id: 0,
                        amount: 5,
                    },
                    { value: parseUnits("5") },
                ),
            ).to.be.revertedWith("TokenTrader: token sale not enabled");
        });

        it("Can't buy more than remaining", async function () {
            await expect(
                trader.buy(
                    {
                        assetType: AssetType.ERC1155,
                        token: multiToken.address,
                        id: 1,
                        amount: 15,
                    },
                    { value: parseUnits("15") },
                ),
            ).to.be.revertedWith("TokenTrader: remaining amount too low");
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

            expect(await multiToken.balanceOf(owner.address, 1)).to.equal(5);
            expect(await ethers.provider.getBalance(trader.address)).to.equal(parseUnits("5"));

            const info = await trader.tradeInfoERC1155(multiToken.address, 1);
            expect(info.amount).to.equal(5);
        });

        it("Owner and only owner can set trade info, arguments should be correct", async function () {
            await expect(
                trader
                    .connect(other)
                    .setTradeInfoERC1155(multiToken.address, [1], [false], [0], [10]),
            ).to.be.revertedWith("Ownable: caller is not the owner");

            await expect(
                trader.setTradeInfoERC1155(multiToken.address, [1], [false], [0], [10, 20]),
            ).to.be.revertedWith("TokenTrader: length mismatch");

            await trader.setTradeInfoERC1155(multiToken.address, [1], [false], [0], [10]);
            const info = await trader.tradeInfoERC1155(multiToken.address, 1);
            expect(info.enabled).to.be.false;
            expect(info.price).to.equal(0);
            expect(info.amount).to.equal(10);
        });
    });
});
