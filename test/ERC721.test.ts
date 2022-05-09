import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC721Preset, ERC721TokenMock } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Block } from "@ethersproject/abstract-provider";
import {
    DomainERC721,
    ERC721Permit,
    ERC721PermitAll,
    TypesAllERC721,
    TypesERC721,
} from "./utils/permits";
import { increaseTime, signMessage } from "./utils";
import { Signature } from "ethers";
import { splitSignature } from "ethers/lib/utils";

describe("Test ERC721Preset contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let token: ERC721Preset;

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("ERC721Preset");
        token = (await TokenFactory.deploy(
            "TestToken",
            "TT",
            "base/",
            owner.address,
            10,
            false,
        )) as ERC721Preset;
    });

    it("Can't deploy with wrong royalty", async function () {
        const TokenFactory = await ethers.getContractFactory("ERC721Preset");
        await expect(
            TokenFactory.deploy("TestToken", "TT", "base/", owner.address, 5000, false),
        ).to.be.revertedWith("ERC721Royalties: invalid royalty value");
    });

    it("Supports interface check works", async function () {
        const interfaceId = "0x1af9cf49"; // royalties interface id
        expect(await token.supportsInterface(interfaceId)).to.be.true;
    });

    it("Name and symbol are correct", async function () {
        expect(await token.name()).to.equal("TestToken");
        expect(await token.symbol()).to.equal("TT");
    });

    it("Only minter can mint", async function () {
        await expect(token.connect(other).mint(other.address, 1)).to.be.revertedWith(
            "Caller is not minter",
        );
    });

    it("Token URI is correct", async function () {
        await token.mint(owner.address, 1);
        expect(await token.tokenURI(0)).to.equal("base/0");
    });

    it("Owner and only owner can set base URI", async function () {
        await expect(token.connect(other).setBaseURI("newbase/")).to.be.revertedWith(
            "Ownable: caller is not the owner",
        );

        await token.setBaseURI("newbase/");
        await token.mint(owner.address, 1);
        expect(await token.tokenURI(0)).to.equal("newbase/0");
    });

    it("Owner and only owner can set minter", async function () {
        await expect(token.connect(other).setMinter(other.address)).to.be.revertedWith(
            "Ownable: caller is not the owner",
        );

        await token.setMinter(other.address);
        expect(await token.minter()).to.equal(other.address);
    });

    describe("Permit", function () {
        let block: Block, permit: ERC721Permit, sig: Signature;

        this.beforeEach(async function () {
            await token.mint(owner.address, 1);

            block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

            permit = {
                owner: owner.address,
                spender: other.address,
                tokenId: 0,
                deadline: block.timestamp + 50,
                nonce: 0,
            };
            sig = splitSignature(
                await signMessage(owner, DomainERC721(token), TypesERC721, permit),
            );
        });

        it("Nonce is basically valid", async function () {
            expect(await token.nonceOf(owner.address)).to.equal(0);
        });

        it("Can't permit with expired signature", async function () {
            await increaseTime(100);
            await expect(
                token
                    .connect(other)
                    .permit(
                        owner.address,
                        other.address,
                        0,
                        block.timestamp + 50,
                        sig.v,
                        sig.r,
                        sig.s,
                    ),
            ).to.be.revertedWith("ERC721Permit: expired deadline");
        });

        it("Can't permit with wrong signer", async function () {
            sig = splitSignature(
                await signMessage(other, DomainERC721(token), TypesERC721, permit),
            );
            await expect(
                token
                    .connect(other)
                    .permit(
                        owner.address,
                        other.address,
                        0,
                        block.timestamp + 50,
                        sig.v,
                        sig.r,
                        sig.s,
                    ),
            ).to.be.revertedWith("ERC721Permit: invalid signature");
        });

        it("Can't permit if token is not owned by signer", async function () {
            permit.owner = other.address;
            sig = splitSignature(
                await signMessage(other, DomainERC721(token), TypesERC721, permit),
            );

            await expect(
                token
                    .connect(other)
                    .permit(
                        other.address,
                        other.address,
                        0,
                        block.timestamp + 50,
                        sig.v,
                        sig.r,
                        sig.s,
                    ),
            ).to.be.revertedWith("ERC721Permit: signer is not owner nor approved for all");
        });

        it("Can permit with valid sig", async function () {
            await token
                .connect(other)
                .permit(owner.address, other.address, 0, block.timestamp + 50, sig.v, sig.r, sig.s);

            expect(await token.getApproved(0)).to.equal(other.address);
        });
    });

    describe("Permit all", function () {
        let block: Block, permit: ERC721PermitAll, sig: Signature;

        this.beforeEach(async function () {
            await token.mint(owner.address, 1);

            block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

            permit = {
                owner: owner.address,
                spender: other.address,
                deadline: block.timestamp + 50,
                nonce: 0,
            };
            sig = splitSignature(
                await signMessage(owner, DomainERC721(token), TypesAllERC721, permit),
            );
        });

        it("Can't permit with expired signature", async function () {
            await increaseTime(100);
            await expect(
                token
                    .connect(other)
                    .permitAll(
                        owner.address,
                        other.address,
                        block.timestamp + 50,
                        sig.v,
                        sig.r,
                        sig.s,
                    ),
            ).to.be.revertedWith("ERC721Permit: expired deadline");
        });

        it("Can't permit with wrong signer", async function () {
            sig = splitSignature(
                await signMessage(other, DomainERC721(token), TypesAllERC721, permit),
            );
            await expect(
                token
                    .connect(other)
                    .permitAll(
                        owner.address,
                        other.address,
                        block.timestamp + 50,
                        sig.v,
                        sig.r,
                        sig.s,
                    ),
            ).to.be.revertedWith("ERC721Permit: invalid signature");
        });

        it("Can permit with valid sig", async function () {
            await token
                .connect(other)
                .permitAll(owner.address, other.address, block.timestamp + 50, sig.v, sig.r, sig.s);

            expect(await token.isApprovedForAll(owner.address, other.address)).to.be.true;
        });
    });

    describe("Royalties", function () {
        this.beforeEach(async function () {
            const TokenFactory = await ethers.getContractFactory("ERC721Preset");
            token = (await TokenFactory.deploy(
                "TestToken",
                "TT",
                "base/",
                owner.address,
                10,
                true,
            )) as ERC721Preset;

            await token.mint(owner.address, 10);
            await token.mint(owner.address, 10);
        });

        it("Can't get receiver for non-existent", async function () {
            await expect(token.getRoyalty(30)).to.be.revertedWith(
                "ERC721Royalties: royalty receiver query for nonexistent token",
            );
        });

        it("Royalty receiver changes at transfer", async function () {
            await token.transferFrom(owner.address, other.address, 3);

            let royalty = await token.getRoyalty(3);
            expect(royalty.receiver).to.equal(owner.address);

            await token.connect(other).transferFrom(other.address, owner.address, 3);

            royalty = await token.getRoyalty(3);
            expect(royalty.receiver).to.equal(other.address);
        });

        it("Royalties in batches & set royalties", async function () {
            const TokenFactory = await ethers.getContractFactory("ERC721TokenMock");
            const tokenMock = (await TokenFactory.deploy(owner.address, 10)) as ERC721TokenMock;
            await tokenMock.mint(owner.address, 10);
            await tokenMock.mint(owner.address, 10);

            await expect(tokenMock.setRoyaltyReceiver(100, other.address)).to.be.revertedWith(
                "ERC721Royalties: set royalty receiver for nonexistent token",
            );

            await tokenMock.setRoyaltyReceiver(10, ethers.constants.AddressZero);
            const royalty = await tokenMock.getRoyalty(10);
            expect(royalty.receiver).to.equal(ethers.constants.AddressZero);
        });
    });
});
