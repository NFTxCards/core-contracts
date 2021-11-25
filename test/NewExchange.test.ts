import { ethers, network } from "hardhat";
import { signMessage } from "./utils";

import { expect } from "chai";
import { ERC1155TokenMock, ERC20TokenMock, ERC721TokenMock, Exchange } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish, BytesLike } from "ethers";
import { Block } from "@ethersproject/abstract-provider";

const parseUnits = ethers.utils.parseUnits;

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

const badSig = {
    v: 0,
    r: ethers.utils.formatBytes32String("bad"),
    s: ethers.utils.formatBytes32String("bad"),
};

describe("Test Exchange contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let exchange: Exchange, token: ERC20TokenMock, nft: ERC721TokenMock;
    let chainId: number, block: Block;
    let orderToSign: OrderToSign, order: Order;

    const TypesOrder = {
        Order: [
            { name: "account", type: "address" },
            {
                name: "commodity",
                type: "Asset",
            },
            {
                name: "payment",
                type: "Asset",
            },
            { name: "expiry", type: "uint64" },
            { name: "nonce", type: "uint8" },
        ],
        Asset: [
            { name: "token", type: "address" },
            { name: "id", type: "uint256" },
            { name: "amount", type: "uint256" },
        ],
    };

    async function signOrder(signer: SignerWithAddress, order: OrderToSign) {
        return await signMessage(signer, {}, TypesOrder, order);
    }

    const DomainERC20 = (token: ERC20TokenMock) => ({
        name: "ERC20Permit",
        version: "1",
        chainId,
        verifyingContract: token.address,
    });

    const TypesERC20 = {
        Permit: [
            { name: "owner", type: "address" },
            { name: "spender", type: "address" },
            { name: "value", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" },
        ],
    };

    /*async function signPermit(signer: SignerWithAddress, permit: PermitERC20) {
        return await signMessage(signer, DomainERC20(token), TypesERC20, permit);
    }*/

    this.beforeAll(async function () {
        [owner, other] = await ethers.getSigners();
        chainId = network.config.chainId!;
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

        const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
        nft = (await ERC721TokenMockFactory.deploy()) as ERC721TokenMock;
        await nft.setApprovalForAll(exchange.address, true);
        await nft.connect(other).setApprovalForAll(exchange.address, true);

        await nft.multipleAwardItem(owner.address, 1);

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    });

    describe("Sell orders", async function () {
        this.beforeEach(async function () {
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

        it("Send order", async function () {
            await exchange.connect(other).matchOrder(order, []);
        });
    });
});
