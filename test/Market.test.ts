import { ethers, network } from "hardhat";
import {
    restoreSnapshot,
    mineBlocks,
    takeSnapshot,
    getRSVFromSign,
    getVerifyMessageParams,
    signMessage,
} from "./utils";

import { expect } from "chai";
import { ERC20TokenMock, ERC721TokenMock, Market } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { Block } from "@ethersproject/abstract-provider";

const parseUnits = ethers.utils.parseUnits;

type Bid = {
    currency: string;
    amount: BigNumberish;
    bidder: string;
    token: string;
    tokenId: BigNumberish;
    expiry: BigNumberish;
    nonce: BigNumberish;
};

describe("Test Market contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let market: Market, token: ERC20TokenMock, nft: ERC721TokenMock;
    let chainId: number, block: Block;
    let bid: Bid;

    const Domain = (market: Market) => ({
        name: "NFTxCards Market",
        version: "1",
        chainId,
        verifyingContract: market.address,
    });
    const Types = {
        Bid: [
            { name: "currency", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "bidder", type: "address" },
            { name: "token", type: "address" },
            { name: "tokenId", type: "uint256" },
            { name: "expiry", type: "uint64" },
            { name: "nonce", type: "uint8" },
        ],
    };

    async function signBid(signer: SignerWithAddress, bid: Bid) {
        return await signMessage(signer, Domain(market), Types, bid);
    }

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        chainId = network.config.chainId!;

        const MarketFactory = await ethers.getContractFactory("Market");
        market = (await MarketFactory.deploy()) as Market;

        const ERC20TokenMockFactory = await ethers.getContractFactory("ERC20TokenMock");
        token = (await ERC20TokenMockFactory.deploy(parseUnits("100000"))) as ERC20TokenMock;
        await token.approve(market.address, ethers.constants.MaxUint256);
        await token.connect(other).approve(market.address, ethers.constants.MaxUint256);

        const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
        nft = (await ERC721TokenMockFactory.deploy()) as ERC721TokenMock;
        await nft.setApprovalForAll(market.address, true);
        await nft.connect(other).setApprovalForAll(market.address, true);

        await nft.multipleAwardItem(other.address, 1);

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

        bid = {
            currency: token.address,
            amount: parseUnits("10"),
            bidder: owner.address,
            token: nft.address,
            tokenId: 1,
            expiry: block.timestamp + 10000,
            nonce: 1,
        };
    });

    it("Can't accept bid with incorrect signature", async function () {
        const badBytes = ethers.utils.formatBytes32String("bad");

        await expect(
            market.connect(other).acceptBid(bid, 0, badBytes, badBytes),
        ).to.be.revertedWith("Market: invalid signature");
    });

    it("Can't accept bid with expited signature", async function () {
        bid.expiry = block.timestamp - 100;

        const { v, r, s } = await signBid(owner, bid);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "Market: bid expired",
        );
    });

    it("Can't accept zero bid", async function () {
        bid.amount = 0;

        const { v, r, s } = await signBid(owner, bid);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "Market: can not accept bid of 0",
        );
    });

    it("Can't accept bid if bidder didn't approve token", async function () {
        await token.approve(market.address, 0);

        const { v, r, s } = await signBid(owner, bid);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "ERC20: transfer amount exceeds allowance",
        );
    });

    it("Can't accept bid if acceptor didn't approve token", async function () {
        await nft.connect(other).setApprovalForAll(market.address, false);

        const { v, r, s } = await signBid(owner, bid);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "ERC721: transfer caller is not owner nor approved",
        );
    });

    it("Bidding with correct signature works", async function () {
        const { v, r, s } = await signBid(owner, bid);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.emit(market, "BidAccepted");

        expect(await nft.ownerOf(1)).to.equal(owner.address);
        expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
    });

    it("Can't accept one bid two times", async function () {
        const { v, r, s } = await signBid(owner, bid);

        await market.connect(other).acceptBid(bid, v, r, s);

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "Market: bid cancelled or executed",
        );
    });

    it("Can't accept cancelled bid", async function () {
        const { v, r, s } = await signBid(owner, bid);

        await expect(market.cancelBid(bid)).to.emit(market, "BidCancelled");

        await expect(market.connect(other).acceptBid(bid, v, r, s)).to.be.revertedWith(
            "Market: bid cancelled or executed",
        );
    });

    it("Can't cancel other's bid", async function () {
        await expect(market.connect(other).cancelBid(bid)).to.be.revertedWith(
            "Market: can not cancel other bidder",
        );
    });

    it("Can't cancel twice", async function () {
        await market.cancelBid(bid);
        await expect(market.cancelBid(bid)).to.be.revertedWith("Market: bid cancelled or executed");
    });
});
