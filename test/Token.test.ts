import { ethers } from "hardhat";
import { expect } from "chai";
import { ERC721Preset } from "../types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

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
        )) as ERC721Preset;
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
});
