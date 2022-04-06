import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC20TokenMock } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Block } from "@ethersproject/abstract-provider";
import { DomainERC20, ERC20Permit, TypesERC20 } from "./utils/permits";
import { increaseTime, signMessage } from "./utils";
import { Signature } from "ethers";
import { parseUnits } from "ethers/lib/utils";
import { splitSignature } from "ethers/lib/utils";

describe("Test ERC20Permit contract", function () {
    let owner: SignerWithAddress, other: SignerWithAddress;
    let token: ERC20TokenMock;
    let block: Block, permit: ERC20Permit, sig: Signature;

    this.beforeEach(async function () {
        [owner, other] = await ethers.getSigners();

        const TokenFactory = await ethers.getContractFactory("ERC20TokenMock");
        token = (await TokenFactory.deploy(parseUnits("1000"))) as ERC20TokenMock;

        block = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

        permit = {
            owner: owner.address,
            spender: other.address,
            value: parseUnits("1"),
            deadline: block.timestamp + 50,
            nonce: 0,
        };
        sig = splitSignature(await signMessage(owner, DomainERC20(token), TypesERC20, permit));
    });

    it("Nonce is valid", async function () {
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
                    parseUnits("1"),
                    block.timestamp + 50,
                    sig.v,
                    sig.r,
                    sig.s,
                ),
        ).to.be.revertedWith("ERC20Permit: expired deadline");
    });

    it("Can't permit with wrong signer", async function () {
        sig = splitSignature(await signMessage(other, DomainERC20(token), TypesERC20, permit));
        await expect(
            token
                .connect(other)
                .permit(
                    owner.address,
                    other.address,
                    parseUnits("1"),
                    block.timestamp + 50,
                    sig.v,
                    sig.r,
                    sig.s,
                ),
        ).to.be.revertedWith("ERC20Permit: invalid signature");
    });

    it("Valid permit works", async function () {
        await token
            .connect(other)
            .permit(
                owner.address,
                other.address,
                parseUnits("1"),
                block.timestamp + 50,
                sig.v,
                sig.r,
                sig.s,
            );

        expect(await token.allowance(owner.address, other.address)).to.equal(parseUnits("1"));
    });
});
