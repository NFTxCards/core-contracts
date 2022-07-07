import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC1155TokenMock } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Block } from "@ethersproject/abstract-provider";
import { TypesERC1155, ERC1155Permit, DomainERC1155, signPermitERC1155 } from "./utils/permits";
import { increaseTime, signMessage } from "./utils";
import { Signature } from "ethers";
import { splitSignature } from "ethers/lib/utils";

describe("Test ERC1155 contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let token: ERC1155TokenMock;
    let block: Block, permit: ERC1155Permit, sig: Signature;

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("NFTxCards");
        token = (await TokenFactory.deploy("uri", owner.address)) as ERC1155TokenMock;

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

        permit = {
            owner: owner.address,
            spender: other.address,
            deadline: block.timestamp + 50,
            nonce: 0,
        };
        sig = splitSignature(await signMessage(owner, DomainERC1155(token), TypesERC1155, permit));
    });

    it("Only minter can mint", async function () {
        await expect(token.connect(other).mint(other.address, 1, 1)).to.be.revertedWith(
            "Caller is not minter",
        );

        await token.mint(other.address, 1, 3);
        expect(await token.balanceOf(other.address, 1)).to.equal(3);
    });

    it("Owner and only owner can set minter", async function () {
        await expect(token.connect(other).setMinter(other.address)).to.be.revertedWith(
            "Ownable: caller is not the owner",
        );

        await token.setMinter(other.address);
        expect(await token.minter()).to.equal(other.address);
    });

    it("Interface support check works", async function () {
        const interfaceId = "0x48613c28"; // permit inteface id
        expect(await token.supportsInterface(interfaceId)).to.be.true;
    });

    it("Nonce is valid", async function () {
        expect(await token.nonceOf(owner.address)).to.equal(0);
    });

    it("Can't permit with expired signature", async function () {
        await increaseTime(100);
        await expect(
            token
                .connect(other)
                .permit(owner.address, other.address, block.timestamp + 50, sig.v, sig.r, sig.s),
        ).to.be.revertedWith("ERC1155Permit: expired deadline");
    });

    it("Can't permit with wrong signer", async function () {
        sig = splitSignature(await signMessage(other, DomainERC1155(token), TypesERC1155, permit));
        await expect(
            token
                .connect(other)
                .permit(owner.address, other.address, block.timestamp + 50, sig.v, sig.r, sig.s),
        ).to.be.revertedWith("ERC1155Permit: invalid signature");
    });

    it("Valid permit works", async function () {
        await token
            .connect(other)
            .permit(owner.address, other.address, block.timestamp + 50, sig.v, sig.r, sig.s);

        expect(await token.isApprovedForAll(owner.address, other.address)).to.be.true;
    });
});
