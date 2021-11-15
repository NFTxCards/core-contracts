import { ethers, network } from "hardhat";
import { signMessage } from "./utils";

import { expect } from "chai";
import { ERC1155TokenMock, ERC20TokenMock, ERC721TokenMock, Exchange } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumberish } from "ethers";
import { Block } from "@ethersproject/abstract-provider";

const parseUnits = ethers.utils.parseUnits;

type OrderERC721 = {
    currency: string;
    price: BigNumberish;
    maker: string;
    token: string;
    tokenId: BigNumberish;
    expiry: BigNumberish;
    nonce: BigNumberish;
};

type OrderERC1155 = {
    currency: string;
    price: BigNumberish;
    maker: string;
    token: string;
    typeId: BigNumberish;
    amount: BigNumberish;
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

describe("Test Exchange contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let exchange: Exchange, token: ERC20TokenMock, nft: ERC721TokenMock;
    let chainId: number, block: Block;

    const Domain = (exchange: Exchange) => ({
        name: "NFTxCards Exchange",
        version: "1",
        chainId,
        verifyingContract: exchange.address,
    });

    const TypesERC1155 = {
        OrderERC1155: [
            { name: "token", type: "address" },
            { name: "typeId", type: "uint256" },
            { name: "amount", type: "uint256" },
            { name: "maker", type: "address" },
            { name: "currency", type: "address" },
            { name: "price", type: "uint256" },
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

    describe("Orders for ERC721", async function () {
        let nft: ERC721TokenMock,
            order: OrderERC721,
            permit: PermitERC20,
            permitNft: PermitERC721,
            permitAllNft: PermitAllERC721;

        const DomainERC721 = (nft: ERC721TokenMock) => ({
            name: "ERC721Permit",
            version: "1",
            chainId,
            verifyingContract: nft.address,
        });

        const TypesOrderERC721 = {
            OrderERC721: [
                { name: "token", type: "address" },
                { name: "tokenId", type: "uint256" },
                { name: "maker", type: "address" },
                { name: "currency", type: "address" },
                { name: "price", type: "uint256" },
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

        async function signOrder(signer: SignerWithAddress, order: OrderERC721) {
            return await signMessage(signer, Domain(exchange), TypesOrderERC721, order);
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
            await nft.setApprovalForAll(exchange.address, true);
            await nft.connect(other).setApprovalForAll(exchange.address, true);

            await nft.multipleAwardItem(owner.address, 1);

            order = {
                currency: token.address,
                price: parseUnits("10"),
                maker: owner.address,
                token: nft.address,
                tokenId: 1,
                expiry: block.timestamp + 10000,
                nonce: 1,
            };

            permit = {
                owner: other.address,
                spender: exchange.address,
                value: order.price,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitNft = {
                owner: owner.address,
                spender: exchange.address,
                tokenId: 1,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitAllNft = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
        });

        it("Can't accept order with incorrect signature", async function () {
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, badSig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ECDSA: invalid signature 'v' value");

            const otherSig = await signOrder(other, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, otherSig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: invalid signature");
        });

        it("Can't accept order with expired signature", async function () {
            order.expiry = block.timestamp - 100;

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: order expired");
        });

        it("Can't accept zero order", async function () {
            order.price = 0;

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: can not accept order of 0");
        });

        it("Can't accept order if taker didn't approve token and didn't pass permit sig", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it("Can't accept order if maker didn't approve token and didn't pass permit sig", async function () {
            await nft.setApprovalForAll(exchange.address, false);

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("ERC721: transfer caller is not owner nor approved");
        });

        it("Orderding with correct signature works", async function () {
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.emit(exchange, "OrderERC721Accepted");

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Ordering with ETH works", async function () {
            order.currency = ethers.constants.AddressZero;

            const sig = await signOrder(owner, order);

            const balanceBefore = await owner.getBalance();

            await exchange
                .connect(other)
                .acceptETHOrderERC721(order, sig, emptyERC721Sig, { value: order.price });

            expect(await nft.ownerOf(1)).to.equal(other.address);

            const balanceAfter = await owner.getBalance();
            expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("10"));
        });

        it("Can't accept ETH order with insufficient tx value", async function () {
            order.currency = ethers.constants.AddressZero;
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptETHOrderERC721(order, sig, emptyERC721Sig, { value: parseUnits("1") }),
            ).to.be.revertedWith("Exchange: passed value is lower than price");
        });

        it("Can't accept non-ETH order with ETH", async function () {
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptETHOrderERC721(order, sig, emptyERC721Sig, { value: order.price }),
            ).to.be.revertedWith("Exchange: order currency is not ETH");
        });

        it("Orderding without currency approval but with permit works", async function () {
            await token.approve(exchange.address, 0);

            const orderSig = await signOrder(owner, order);
            const permitSig = await signPermit(other, permit);

            await exchange.connect(other).acceptOrderERC721(
                order,
                orderSig,
                {
                    exists: true,
                    amount: permit.value,
                    deadline: permit.deadline,
                    sig: permitSig,
                },
                emptyERC721Sig,
            );

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Orderding without nft approval but with permit works", async function () {
            await nft.connect(other).setApprovalForAll(exchange.address, false);

            const orderSig = await signOrder(owner, order);
            const permitSig = await signPermitNft(owner, permitNft);

            await exchange.connect(other).acceptOrderERC721(order, orderSig, emptyERC20Sig, {
                exists: true,
                forAll: false,
                tokenId: permitNft.tokenId,
                deadline: permitNft.deadline,
                sig: permitSig,
            });

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Orderding without nft approval but with permit for all works", async function () {
            await nft.connect(other).setApprovalForAll(exchange.address, false);

            const orderSig = await signOrder(owner, order);
            const permitSig = await signPermitAllNft(owner, permitAllNft);

            await exchange.connect(other).acceptOrderERC721(order, orderSig, emptyERC20Sig, {
                exists: true,
                forAll: true,
                tokenId: 0,
                deadline: permitNft.deadline,
                sig: permitSig,
            });

            expect(await nft.ownerOf(1)).to.equal(other.address);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Can't accept one order two times", async function () {
            const sig = await signOrder(owner, order);

            await exchange
                .connect(other)
                .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig);

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: order cancelled or executed");
        });

        it("Can't accept cancelled order", async function () {
            const sig = await signOrder(owner, order);

            await expect(exchange.cancelOrderERC721(order)).to.emit(
                exchange,
                "OrderERC721Cancelled",
            );

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC721(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: order cancelled or executed");
        });

        it("Can't cancel other's order", async function () {
            await expect(exchange.connect(other).cancelOrderERC721(order)).to.be.revertedWith(
                "Exchange: can not cancel other maker",
            );
        });

        it("Can't cancel twice", async function () {
            await exchange.cancelOrderERC721(order);
            await expect(exchange.cancelOrderERC721(order)).to.be.revertedWith(
                "Exchange: order cancelled or executed",
            );
        });
    });

    describe("Orders for ERC1155", async function () {
        let multiToken: ERC1155TokenMock,
            order: OrderERC1155,
            permit: PermitERC20,
            permitMulti: PermitERC1155;

        const DomainERC1155 = (multiToken: ERC1155TokenMock) => ({
            name: "ERC1155Permit",
            version: "1",
            chainId,
            verifyingContract: multiToken.address,
        });

        const TypesOrderERC1155 = {
            OrderERC1155: [
                { name: "token", type: "address" },
                { name: "typeId", type: "uint256" },
                { name: "amount", type: "uint256" },
                { name: "maker", type: "address" },
                { name: "currency", type: "address" },
                { name: "price", type: "uint256" },
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

        async function signOrder(signer: SignerWithAddress, order: OrderERC1155) {
            return await signMessage(signer, Domain(exchange), TypesOrderERC1155, order);
        }

        async function signPermitMulti(signer: SignerWithAddress, permit: PermitERC1155) {
            return await signMessage(signer, DomainERC1155(multiToken), TypesERC1155, permit);
        }

        this.beforeEach(async function () {
            const ERC1155TokenMockFactory = await ethers.getContractFactory("ERC1155TokenMock");
            multiToken = (await ERC1155TokenMockFactory.deploy()) as ERC1155TokenMock;
            await multiToken.setApprovalForAll(exchange.address, true);
            await multiToken.connect(other).setApprovalForAll(exchange.address, true);

            await multiToken.multipleAwardItem(owner.address, 1, 10);

            order = {
                currency: token.address,
                price: parseUnits("10"),
                maker: owner.address,
                token: multiToken.address,
                typeId: 1,
                amount: 10,
                expiry: block.timestamp + 10000,
                nonce: 1,
            };

            permit = {
                owner: other.address,
                spender: exchange.address,
                value: order.price,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };

            permitMulti = {
                owner: owner.address,
                spender: exchange.address,
                deadline: block.timestamp + 10000,
                nonce: 0,
            };
        });

        it("Can't accept order with incorrect signature", async function () {
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, badSig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ECDSA: invalid signature 'v' value");

            const otherSig = await signOrder(other, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, otherSig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Exchange: invalid signature");
        });

        it("Can't accept order with expired signature", async function () {
            order.expiry = block.timestamp - 100;

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Exchange: order expired");
        });

        it("Can't accept zero order", async function () {
            order.price = 0;

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Exchange: can not accept order of 0");
        });

        it("Can't accept order if taker didn't approve token and didn't pass permit sig", async function () {
            await token.connect(other).approve(exchange.address, 0);

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ERC20: transfer amount exceeds allowance");
        });

        it("Can't accept order if maker didn't approve token and didn't pass permit sig", async function () {
            await multiToken.setApprovalForAll(exchange.address, false);

            const sig = await signOrder(owner, order);
            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("ERC1155: caller is not owner nor approved");
        });

        it("Orderding with correct signature works", async function () {
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.emit(exchange, "OrderERC1155Accepted");

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(10);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Ordering with ETH works", async function () {
            order.currency = ethers.constants.AddressZero;

            const sig = await signOrder(owner, order);

            const balanceBefore = await owner.getBalance();

            await exchange
                .connect(other)
                .acceptETHOrderERC1155(order, sig, emptyERC20Sig, { value: order.price });

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(10);

            const balanceAfter = await owner.getBalance();
            expect(balanceAfter.sub(balanceBefore)).to.equal(parseUnits("10"));
        });

        it("Can't accept ETH order with insufficient tx value", async function () {
            order.currency = ethers.constants.AddressZero;
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptETHOrderERC1155(order, sig, emptyERC20Sig, { value: parseUnits("1") }),
            ).to.be.revertedWith("Exchange: passed value is lower than price");
        });

        it("Can't accept non-ETH order with ETH", async function () {
            const sig = await signOrder(owner, order);

            await expect(
                exchange
                    .connect(other)
                    .acceptETHOrderERC1155(order, sig, emptyERC20Sig, { value: order.price }),
            ).to.be.revertedWith("Exchange: order currency is not ETH");
        });

        it("Orderding without currency approval but with permit works", async function () {
            await token.approve(exchange.address, 0);

            const orderSig = await signOrder(owner, order);
            const permitSig = await signPermit(other, permit);

            await exchange.connect(other).acceptOrderERC1155(
                order,
                orderSig,
                {
                    exists: true,
                    amount: permit.value,
                    deadline: permit.deadline,
                    sig: permitSig,
                },
                emptyERC1155Sig,
            );

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(10);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Orderding without nft approval but with permit works", async function () {
            await multiToken.connect(other).setApprovalForAll(exchange.address, false);

            const orderSig = await signOrder(owner, order);
            const permitSig = await signPermitMulti(owner, permitMulti);

            await exchange.connect(other).acceptOrderERC1155(order, orderSig, emptyERC20Sig, {
                exists: true,
                deadline: permitMulti.deadline,
                sig: permitSig,
            });

            expect(await multiToken.balanceOf(other.address, 1)).to.equal(10);
            expect(await token.balanceOf(owner.address)).to.equal(parseUnits("10"));
        });

        it("Can't accept one order two times", async function () {
            const sig = await signOrder(owner, order);

            await exchange
                .connect(other)
                .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig);

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC1155Sig),
            ).to.be.revertedWith("Exchange: order cancelled or executed");
        });

        it("Can't accept cancelled order", async function () {
            const sig = await signOrder(owner, order);

            await expect(exchange.cancelOrderERC1155(order)).to.emit(
                exchange,
                "OrderERC1155Cancelled",
            );

            await expect(
                exchange
                    .connect(other)
                    .acceptOrderERC1155(order, sig, emptyERC20Sig, emptyERC721Sig),
            ).to.be.revertedWith("Exchange: order cancelled or executed");
        });

        it("Can't cancel other's order", async function () {
            await expect(exchange.connect(other).cancelOrderERC1155(order)).to.be.revertedWith(
                "Exchange: can not cancel other maker",
            );
        });

        it("Can't cancel twice", async function () {
            await exchange.cancelOrderERC1155(order);
            await expect(exchange.cancelOrderERC1155(order)).to.be.revertedWith(
                "Exchange: order cancelled or executed",
            );
        });
    });
});
