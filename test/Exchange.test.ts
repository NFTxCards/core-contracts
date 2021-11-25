import { ethers, network } from "hardhat";
import { signMessage } from "./utils";

import { expect } from "chai";
import { ERC1155TokenMock, ERC20TokenMock, ERC721TokenMock, Exchange } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, BytesLike } from "ethers";
import { Block } from "@ethersproject/abstract-provider";
import {
    signPermitAllERC721,
    signPermitERC1155,
    signPermitERC20,
    signPermitERC721,
} from "./utils/permits";

const parseUnits = ethers.utils.parseUnits;
const chainId = network.config.chainId!;

const OrderSide = {
    Buy: 0,
    Sell: 1,
};

const AssetType = {
    ERC20: 0,
    ERC721: 1,
    ERC1155: 2,
};

type OrderToSign = {
    account: string;
    side: BigNumberish;
    commodity: {
        assetType: BigNumberish;
        token: string;
        id: BigNumberish;
        amount: BigNumberish;
    };
    payment: {
        assetType: BigNumberish;
        token: string;
        id: BigNumberish;
        amount: BigNumberish;
    };
    expiry: BigNumberish;
    nonce: BigNumberish;
};

type OrderSigs = {
    permitSig: BytesLike;
    orderSig: { v: BigNumberish; r: BytesLike; s: BytesLike };
};

type Order = OrderToSign & OrderSigs;

const Domain = (exchange: Exchange) => ({
    name: "Exchange",
    version: "1",
    chainId,
    verifyingContract: exchange.address,
});

const TypesOrder = {
    Order: [
        { name: "account", type: "address" },
        { name: "side", type: "uint8" },
        { name: "commodity", type: "Asset" },
        { name: "payment", type: "Asset" },
        { name: "expiry", type: "uint64" },
        { name: "nonce", type: "uint8" },
    ],
    Asset: [
        { name: "assetType", type: "uint8" },
        { name: "token", type: "address" },
        { name: "id", type: "uint256" },
        { name: "amount", type: "uint256" },
    ],
};

const badSig = {
    v: 0,
    r: ethers.utils.formatBytes32String("bad"),
    s: ethers.utils.formatBytes32String("bad"),
};

describe("Test Exchange contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let exchange: Exchange,
        token: ERC20TokenMock,
        nft: ERC721TokenMock,
        multiToken: ERC1155TokenMock;
    let block: Block;
    let orderToSign: OrderToSign, order: Order;

    async function signOrder(signer: SignerWithAddress, order: object) {
        return await signMessage(signer, Domain(exchange), TypesOrder, order);
    }

    this.beforeAll(async function () {
        [owner, other] = await ethers.getSigners();
    });

    this.beforeEach(async function () {
        const ExchangeFactory = await ethers.getContractFactory("Exchange");
        exchange = (await ExchangeFactory.deploy()) as Exchange;

        const ERC20TokenMockFactory = await ethers.getContractFactory("ERC20TokenMock");
        token = (await ERC20TokenMockFactory.connect(other).deploy(
            parseUnits("100000"),
        )) as ERC20TokenMock;
        await token.approve(exchange.address, ethers.constants.MaxUint256);
        await token.connect(other).approve(exchange.address, ethers.constants.MaxUint256);

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    });

    describe("Sell orders for ERC721", async function () {
        this.beforeEach(async function () {
            // Deploy ERC721
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            nft = (await ERC721TokenMockFactory.deploy()) as ERC721TokenMock;
            await nft.setApprovalForAll(exchange.address, true);
            await nft.connect(other).setApprovalForAll(exchange.address, true);
            await nft.multipleAwardItem(owner.address, 1);

            // Sign order
            orderToSign = {
                account: owner.address,
                side: OrderSide.Sell,
                commodity: {
                    assetType: AssetType.ERC721,
                    token: nft.address,
                    id: 1,
                    amount: 0,
                },
                payment: {
                    assetType: AssetType.ERC20,
                    token: token.address,
                    id: 0,
                    amount: parseUnits("1"),
                },
                expiry: block.timestamp + 1000,
                nonce: 1,
            };

            order = {
                ...orderToSign,
                permitSig: [],
                orderSig: await signOrder(owner, orderToSign),
            };
        });

        it("Matching order works", async function () {
            await expect(exchange.connect(other).matchOrder(order, [])).to.emit(
                exchange,
                "OrderMatch",
            );

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("1"));
        });

        it("Can't match order without commodity approval and permit", async function () {
            await nft.setApprovalForAll(exchange.address, false);
            await expect(exchange.connect(other).matchOrder(order, [])).to.be.revertedWith(
                "ERC721: transfer caller is not owner nor approved",
            );
        });

        it("Can match order without commodity approval but with permit", async function () {
            await nft.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                tokenId: 1,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC721(owner, nft, permit);
            order.permitSig = permitSig;

            await exchange.connect(other).matchOrder(order, []);
        });

        it("Can match order without commodity approval but with permit for all", async function () {
            await nft.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitAllERC721(owner, nft, permit);
            order.permitSig = permitSig;

            await exchange.connect(other).matchOrder(order, []);
        });

        it("Can't match order without payment approval and permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            await expect(exchange.connect(other).matchOrder(order, [])).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
        });

        it("Can match order without payment approval but with permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const permit = {
                owner: other.address,
                spender: exchange.address,
                value: parseUnits("1"),
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC20(other, token, permit);

            await exchange.connect(other).matchOrder(order, permitSig);
        });

        it("Can't match cancelled order", async function () {
            await exchange.cancelOrder(order);

            await expect(exchange.connect(other).matchOrder(order, [])).to.be.revertedWith(
                "Exchange: order is in wrong state",
            );
        });

        it("Can't cancel other's order", async function () {
            await expect(exchange.connect(other).cancelOrder(order)).to.be.revertedWith(
                "Exchange: sender is not order account",
            );
        });

        it("Can't cancel order twice", async function () {
            await exchange.cancelOrder(order);
            await expect(exchange.cancelOrder(order)).to.be.revertedWith(
                "Exchange: order is in wrong state",
            );
        });
    });

    describe("Sell orders for ERC1155", async function () {
        this.beforeEach(async function () {
            // Deploy ERC1155
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy()) as ERC1155TokenMock;
            await multiToken.setApprovalForAll(exchange.address, true);
            await multiToken.connect(other).setApprovalForAll(exchange.address, true);
            await multiToken.multipleAwardItem(owner.address, 1, 10);

            // Sign order
            orderToSign = {
                account: owner.address,
                side: OrderSide.Sell,
                commodity: {
                    assetType: AssetType.ERC1155,
                    token: multiToken.address,
                    id: 1,
                    amount: 5,
                },
                payment: {
                    assetType: AssetType.ERC20,
                    token: token.address,
                    id: 0,
                    amount: parseUnits("1"),
                },
                expiry: block.timestamp + 1000,
                nonce: 1,
            };

            order = {
                ...orderToSign,
                permitSig: [],
                orderSig: await signOrder(owner, orderToSign),
            };
        });

        it("Matching order works", async function () {
            await expect(exchange.connect(other).matchOrder(order, [])).to.emit(
                exchange,
                "OrderMatch",
            );

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(5);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("1"));
        });

        it("Can't match order without commodity approval and permit", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);
            await expect(exchange.connect(other).matchOrder(order, [])).to.be.revertedWith(
                "ERC1155: caller is not owner nor approved",
            );
        });

        it("Can match order without commodity approval but with permit", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC1155(owner, multiToken, permit);
            order.permitSig = permitSig;

            await exchange.connect(other).matchOrder(order, []);
        });

        it("Can match order without commodity approval but with permit for all", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC1155(owner, multiToken, permit);
            order.permitSig = permitSig;

            await exchange.connect(other).matchOrder(order, []);
        });

        it("Can't match order without payment approval and permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            await expect(exchange.connect(other).matchOrder(order, [])).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
        });

        it("Can match order without payment approval but with permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const permit = {
                owner: other.address,
                spender: exchange.address,
                value: parseUnits("1"),
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC20(other, token, permit);

            await exchange.connect(other).matchOrder(order, permitSig);
        });
    });

    describe("Buy orders for ERC721", async function () {
        this.beforeEach(async function () {
            // Deploy ERC721
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            nft = (await ERC721TokenMockFactory.deploy()) as ERC721TokenMock;
            await nft.setApprovalForAll(exchange.address, true);
            await nft.connect(other).setApprovalForAll(exchange.address, true);
            await nft.multipleAwardItem(owner.address, 1);

            // Sign order
            orderToSign = {
                account: other.address,
                side: OrderSide.Buy,
                commodity: {
                    assetType: AssetType.ERC721,
                    token: nft.address,
                    id: 1,
                    amount: 0,
                },
                payment: {
                    assetType: AssetType.ERC20,
                    token: token.address,
                    id: 0,
                    amount: parseUnits("1"),
                },
                expiry: block.timestamp + 1000,
                nonce: 1,
            };

            order = {
                ...orderToSign,
                permitSig: [],
                orderSig: await signOrder(other, orderToSign),
            };
        });

        it("Matching order works", async function () {
            await expect(exchange.matchOrder(order, [])).to.emit(exchange, "OrderMatch");

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("1"));
        });

        it("Can't match order without commodity approval and permit", async function () {
            await nft.setApprovalForAll(exchange.address, false);
            await expect(exchange.matchOrder(order, [])).to.be.revertedWith(
                "ERC721: transfer caller is not owner nor approved",
            );
        });

        it("Can match order without commodity approval but with permit", async function () {
            await nft.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                tokenId: 1,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC721(owner, nft, permit);

            await exchange.matchOrder(order, permitSig);
        });

        it("Can match order without commodity approval but with permit for all", async function () {
            await nft.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitAllERC721(owner, nft, permit);

            await exchange.matchOrder(order, permitSig);
        });

        it("Can't match order without payment approval and permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            await expect(exchange.matchOrder(order, [])).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
        });

        it("Can match order without payment approval but with permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const permit = {
                owner: other.address,
                spender: exchange.address,
                value: parseUnits("1"),
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            order.permitSig = await signPermitERC20(other, token, permit);

            await exchange.matchOrder(order, []);
        });
    });

    describe("Buy orders for ERC1155", async function () {
        this.beforeEach(async function () {
            // Deploy ERC1155
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy()) as ERC1155TokenMock;
            await multiToken.setApprovalForAll(exchange.address, true);
            await multiToken.connect(other).setApprovalForAll(exchange.address, true);
            await multiToken.multipleAwardItem(owner.address, 1, 10);

            // Sign order
            orderToSign = {
                account: other.address,
                side: OrderSide.Buy,
                commodity: {
                    assetType: AssetType.ERC1155,
                    token: multiToken.address,
                    id: 1,
                    amount: 5,
                },
                payment: {
                    assetType: AssetType.ERC20,
                    token: token.address,
                    id: 0,
                    amount: parseUnits("1"),
                },
                expiry: block.timestamp + 1000,
                nonce: 1,
            };

            order = {
                ...orderToSign,
                permitSig: [],
                orderSig: await signOrder(other, orderToSign),
            };
        });

        it("Matching order works", async function () {
            await expect(exchange.matchOrder(order, [])).to.emit(exchange, "OrderMatch");

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(5);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("1"));
        });

        it("Can't match order without commodity approval and permit", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);
            await expect(exchange.matchOrder(order, [])).to.be.revertedWith(
                "ERC1155: caller is not owner nor approved",
            );
        });

        it("Can match order without commodity approval but with permit", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC1155(owner, multiToken, permit);

            await exchange.matchOrder(order, permitSig);
        });

        it("Can match order without commodity approval but with permit for all", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);

            const permit = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            const permitSig = await signPermitERC1155(owner, multiToken, permit);

            await exchange.matchOrder(order, permitSig);
        });

        it("Can't match order without payment approval and permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            await expect(exchange.matchOrder(order, [])).to.be.revertedWith(
                "ERC20: transfer amount exceeds allowance",
            );
        });

        it("Can match order without payment approval but with permit", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const permit = {
                owner: other.address,
                spender: exchange.address,
                value: parseUnits("1"),
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
            order.permitSig = await signPermitERC20(other, token, permit);

            await exchange.matchOrder(order, []);
        });
    });
});
