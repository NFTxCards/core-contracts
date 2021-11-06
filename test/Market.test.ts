import { ethers, network } from "hardhat";
import { signMessage } from "./utils";

import { expect } from "chai";
import { ERC1155TokenMock, ERC20TokenMock, ERC721TokenMock, Market } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { Block } from "@ethersproject/abstract-provider";

const parseUnits = ethers.utils.parseUnits;

type BidERC721 = {
    currency: string;
    amount: BigNumberish;
    bidder: string;
    token: string;
    tokenId: BigNumberish;
    expiry: BigNumberish;
    nonce: BigNumberish;
};

type BidERC1155 = {
    currency: string;
    currencyAmount: BigNumberish;
    bidder: string;
    token: string;
    typeId: BigNumberish;
    tokenAmount: BigNumberish;
    expiry: BigNumberish;
    nonce: BigNumberish;
};

type PermitERC20 = {
    owner: string;
    spender: string;
    value: BigNumberish;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

type PermitERC721 = {
    owner: string;
    spender: string;
    tokenId: BigNumberish;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

type PermitAllERC721 = {
    owner: string;
    spender: string;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

type PermitERC1155 = {
    owner: string;
    spender: string;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

const badSig = {
    v: 0,
    r: ethers.utils.formatBytes32String("bad"),
    s: ethers.utils.formatBytes32String("bad"),
};

const emptyERC20Sig = {
    exists: false,
    amount: 0,
    deadline: 0,
    sig: badSig,
};

const emptyERC721Sig = {
    exists: false,
    forAll: false,
    tokenId: 0,
    deadline: 0,
    sig: badSig,
};

const emptyERC1155Sig = {
    exists: false,
    deadline: 0,
    sig: badSig,
};

describe("Test Market contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let market: Market, token: ERC20TokenMock, nft: ERC721TokenMock;
    let chainId: number, block: Block;

    const Domain = (market: Market) => ({
        name: "NFTxCards Market",
        version: "1",
        chainId,
        verifyingContract: market.address,
    });

    const TypesERC1155 = {
        BidERC1155: [
            { name: "currency", type: "address" },
            { name: "currencyAmount", type: "uint256" },
            { name: "bidder", type: "address" },
            { name: "token", type: "address" },
            { name: "typeId", type: "uint256" },
            { name: "tokenAmount", type: "uint256" },
            { name: "expiry", type: "uint64" },
            { name: "nonce", type: "uint8" },
        ],
    };

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

    async function signPermit(signer: SignerWithAddress, permit: PermitERC20) {
        return await signMessage(signer, DomainERC20(token), TypesERC20, permit);
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

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
    });

    describe("Bids for ERC721", async function () {
        let nft: ERC721TokenMock,
            bid: BidERC721,
            permit: PermitERC20,
            permitNft: PermitERC721,
            permitAllNft: PermitAllERC721;

        const DomainERC721 = (nft: ERC721TokenMock) => ({
            name: "ERC721Permit",
            version: "1",
            chainId,
            verifyingContract: nft.address,
        });

        const TypesBidERC721 = {
            BidERC721: [
                { name: "currency", type: "address" },
                { name: "amount", type: "uint256" },
                { name: "bidder", type: "address" },
                { name: "token", type: "address" },
                { name: "tokenId", type: "uint256" },
                { name: "expiry", type: "uint64" },
                { name: "nonce", type: "uint8" },
            ],
        };

        const TypesERC721 = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "tokenId", type: "uint256" },
                { name: "deadline", type: "uint256" },
                { name: "nonce", type: "uint256" },
            ],
        };

        const TypesAllERC721 = {
            PermitAll: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "deadline", type: "uint256" },
                { name: "nonce", type: "uint256" },
            ],
        };

        async function signBid(signer: SignerWithAddress, bid: BidERC721) {
            return await signMessage(signer, Domain(market), TypesBidERC721, bid);
        }

        async function signPermitNft(signer: SignerWithAddress, permit: PermitERC721) {
            return await signMessage(signer, DomainERC721(nft), TypesERC721, permit);
        }

        async function signPermitAllNft(signer: SignerWithAddress, permit: PermitAllERC721) {
            return await signMessage(signer, DomainERC721(nft), TypesAllERC721, permit);
        }

        this.beforeEach(async function () {
            const ERC721TokenMockFactory = await ethers.getContractFactory("ERC721TokenMock");
            nft = (await ERC721TokenMockFactory.deploy()) as ERC721TokenMock;
            await nft.setApprovalForAll(market.address, true);
            await nft.connect(other).setApprovalForAll(market.address, true);

            await nft.multipleAwardItem(other.address, 1);

            bid = {
                currency: token.address,
                amount: parseUnits("10"),
                bidder: owner.address,
                token: nft.address,
                tokenId: 1,
                expiry: block.timestamp + 10000,
                nonce: 1,
            };

            permit = {
                owner: owner.address,
                spender: market.address,
                value: bid.amount,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitNft = {
                owner: other.address,
                spender: market.address,
                tokenId: 1,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitAllNft = {
                owner: other.address,
                spender: market.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
        });

        it("Can't accept bid with incorrect signature", async function () {
            await expect(
                market.connect(other).acceptBidERC721(bid, badSig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ECDSA: invalid signature 'v' value");

            const otherSig = await signBid(other, bid);
            await expect(
                market.connect(other).acceptBidERC721(bid, otherSig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: invalid signature");
        });

        it("Can't accept bid with expired signature", async function () {
            bid.expiry = block.timestamp - 100;

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: bid expired");
        });

        it("Can't accept zero bid", async function () {
            bid.amount = 0;

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: can not accept bid of 0");
        });

        it("Can't accept bid if bidder didn't approve token and didn't pass permit sig", async function () {
            await token.approve(market.address, 0);

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it("Can't accept bid if acceptor didn't approve token and didn't pass permit sig", async function () {
            await nft.connect(other).setApprovalForAll(market.address, false);

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });

        it("Bidding with correct signature works", async function () {
            const sig = await signBid(owner, bid);

            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.emit(market, "BidERC721Accepted");

            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Bidding without currency approval but with permit works", async function () {
            await token.approve(market.address, 0);

            const bidSig = await signBid(owner, bid);
            const permitSig = await signPermit(owner, permit);

            await market.connect(other).acceptBidERC721(
                bid,
                bidSig,
                {
                    exists: true,
                    amount: permit.value,
                    deadline: permit.deadline,
                    sig: permitSig,
                },
                emptyERC721Sig,
            );

            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Bidding without nft approval but with permit works", async function () {
            await nft.connect(other).setApprovalForAll(market.address, false);

            const bidSig = await signBid(owner, bid);
            const permitSig = await signPermitNft(other, permitNft);

            await market.connect(other).acceptBidERC721(bid, bidSig, emptyERC20Sig, {
                exists: true,
                forAll: false,
                tokenId: permitNft.tokenId,
                deadline: permitNft.deadline,
                sig: permitSig,
            });

            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Bidding without nft approval but with permit for all works", async function () {
            await nft.connect(other).setApprovalForAll(market.address, false);

            const bidSig = await signBid(owner, bid);
            const permitSig = await signPermitAllNft(other, permitAllNft);

            await market.connect(other).acceptBidERC721(bid, bidSig, emptyERC20Sig, {
                exists: true,
                forAll: true,
                tokenId: 0,
                deadline: permitNft.deadline,
                sig: permitSig,
            });

            expect(await nft.ownerOf(1)).to.equal(owner.address);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Can't accept one bid two times", async function () {
            const sig = await signBid(owner, bid);

            await market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig);

            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: bid cancelled or executed");
        });

        it("Can't accept cancelled bid", async function () {
            const sig = await signBid(owner, bid);

            await expect(market.cancelBidERC721(bid)).to.emit(market, "BidERC721Cancelled");

            await expect(
                market.connect(other).acceptBidERC721(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: bid cancelled or executed");
        });

        it("Can't cancel other's bid", async function () {
            await expect(market.connect(other).cancelBidERC721(bid)).to.be.revertedWith(
                "Market: can not cancel other bidder",
            );
        });

        it("Can't cancel twice", async function () {
            await market.cancelBidERC721(bid);
            await expect(market.cancelBidERC721(bid)).to.be.revertedWith(
                "Market: bid cancelled or executed",
            );
        });
    });

    describe("Bids for ERC1155", async function () {
        let multiToken: ERC1155TokenMock,
            bid: BidERC1155,
            permit: PermitERC20,
            permitMulti: PermitERC1155;

        const DomainERC1155 = (multiToken: ERC1155TokenMock) => ({
            name: "ERC1155Permit",
            version: "1",
            chainId,
            verifyingContract: multiToken.address,
        });

        const TypesBidERC1155 = {
            BidERC1155: [
                { name: "currency", type: "address" },
                { name: "currencyAmount", type: "uint256" },
                { name: "bidder", type: "address" },
                { name: "token", type: "address" },
                { name: "typeId", type: "uint256" },
                { name: "tokenAmount", type: "uint256" },
                { name: "expiry", type: "uint64" },
                { name: "nonce", type: "uint8" },
            ],
        };

        const TypesERC1155 = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "deadline", type: "uint256" },
                { name: "nonce", type: "uint256" },
            ],
        };

        async function signBid(signer: SignerWithAddress, bid: BidERC1155) {
            return await signMessage(signer, Domain(market), TypesBidERC1155, bid);
        }

        async function signPermitMulti(signer: SignerWithAddress, permit: PermitERC1155) {
            return await signMessage(signer, DomainERC1155(multiToken), TypesERC1155, permit);
        }

        this.beforeEach(async function () {
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy()) as ERC1155TokenMock;
            await multiToken.setApprovalForAll(market.address, true);
            await multiToken.connect(other).setApprovalForAll(market.address, true);

            await multiToken.multipleAwardItem(other.address, 1, 10);

            bid = {
                currency: token.address,
                currencyAmount: parseUnits("10"),
                bidder: owner.address,
                token: multiToken.address,
                typeId: 1,
                tokenAmount: 10,
                expiry: block.timestamp + 10000,
                nonce: 1,
            };

            permit = {
                owner: owner.address,
                spender: market.address,
                value: bid.currencyAmount,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitMulti = {
                owner: other.address,
                spender: market.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
        });

        it("Can't accept bid with incorrect signature", async function () {
            await expect(
                market.connect(other).acceptBidERC1155(bid, badSig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ECDSA: invalid signature 'v' value");

            const otherSig = await signBid(other, bid);
            await expect(
                market
                    .connect(other)
                    .acceptBidERC1155(bid, otherSig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Market: invalid signature");
        });

        it("Can't accept bid with expired signature", async function () {
            bid.expiry = block.timestamp - 100;

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Market: bid expired");
        });

        it("Can't accept zero bid", async function () {
            bid.currencyAmount = 0;

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Market: can not accept bid of 0");
        });

        it("Can't accept bid if bidder didn't approve token and didn't pass permit sig", async function () {
            await token.approve(market.address, 0);

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it("Can't accept bid if acceptor didn't approve token and didn't pass permit sig", async function () {
            await multiToken.connect(other).setApprovalForAll(market.address, false);

            const sig = await signBid(owner, bid);
            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ERC1155: caller is not owner nor approved");
        });

        it("Bidding with correct signature works", async function () {
            const sig = await signBid(owner, bid);

            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.emit(market, "BidERC1155Accepted");

            expect(await multiToken.balanceOf(owner.address, 1)).to.equal(10);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Bidding without currency approval but with permit works", async function () {
            await token.approve(market.address, 0);

            const bidSig = await signBid(owner, bid);
            const permitSig = await signPermit(owner, permit);

            await market.connect(other).acceptBidERC1155(
                bid,
                bidSig,
                {
                    exists: true,
                    amount: permit.value,
                    deadline: permit.deadline,
                    sig: permitSig,
                },
                emptyERC1155Sig,
            );

            expect(await multiToken.balanceOf(owner.address, 1)).to.equal(10);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Bidding without nft approval but with permit works", async function () {
            await multiToken.connect(other).setApprovalForAll(market.address, false);

            const bidSig = await signBid(owner, bid);
            const permitSig = await signPermitMulti(other, permitMulti);

            await market.connect(other).acceptBidERC1155(bid, bidSig, emptyERC20Sig, {
                exists: true,
                deadline: permitMulti.deadline,
                sig: permitSig,
            });

            expect(await multiToken.balanceOf(owner.address, 1)).to.equal(10);
            expect(await token.balanceOf(other.address)).to.equal(parseUnits("10"));
        });

        it("Can't accept one bid two times", async function () {
            const sig = await signBid(owner, bid);

            await market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig);

            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Market: bid cancelled or executed");
        });

        it("Can't accept cancelled bid", async function () {
            const sig = await signBid(owner, bid);

            await expect(market.cancelBidERC1155(bid)).to.emit(market, "BidERC1155Cancelled");

            await expect(
                market.connect(other).acceptBidERC1155(bid, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Market: bid cancelled or executed");
        });

        it("Can't cancel other's bid", async function () {
            await expect(market.connect(other).cancelBidERC1155(bid)).to.be.revertedWith(
                "Market: can not cancel other bidder",
            );
        });

        it("Can't cancel twice", async function () {
            await market.cancelBidERC1155(bid);
            await expect(market.cancelBidERC1155(bid)).to.be.revertedWith(
                "Market: bid cancelled or executed",
            );
        });
    });
});
