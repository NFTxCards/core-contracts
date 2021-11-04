import hre, { ethers } from "hardhat";
import { TypedDataField, TypedDataSigner } from "@ethersproject/abstract-signer";
import { splitSignature } from "ethers/lib/utils";

/**
 *  Takes a snapshot and returns the ID of the snapshot for restoring later.
 * @returns {string} id
 */
export async function takeSnapshot(): Promise<string> {
    return await ethers.provider.send("evm_snapshot", []);
}

export function generateAddress() {
    return ethers.utils.getAddress(
        ethers.utils.hexlify(ethers.utils.randomBytes(20)).substr(2).padStart(40, "0"),
    );
}

export async function signMessage(
    signer: TypedDataSigner,
    domain: object,
    types: Record<string, TypedDataField[]>,
    message: Record<string, any>,
) {
    return splitSignature(await signer._signTypedData(domain, types, message));
}

export function getRSVFromSign(signMessage: string) {
    const signature = signMessage.substring(2);

    const r = "0x" + signature.substring(0, 64);
    const s = "0x" + signature.substring(64, 128);
    const v = parseInt(signature.substring(128, 130), 16);
    return {
        r,
        s,
        v,
    };
}

export async function getVerifyMessageParams(verifyingContract: string, sender: string) {
    const network = await ethers.provider.getNetwork();

    const currentBlock = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());

    return {
        types: {
            EIP712Domain: [
                { name: "name", type: "string" },
                { name: "version", type: "string" },
                { name: "chainId", type: "uint256" },
                { name: "verifyingContract", type: "address" },
            ],
            verify: [
                { name: "sender", type: "address" },
                { name: "deadline", type: "uint" },
            ],
        },
        primaryType: "verify",
        domain: {
            name: "NFTxCards",
            version: "1",
            chainId: network.chainId,
            verifyingContract,
        },
        message: {
            sender,
            deadline: currentBlock.timestamp + 60, // add 60 sec
        },
    };
}

/**
 *  Restores a snapshot that was previously taken with takeSnapshot
 *  @param {string} id The ID that was returned when takeSnapshot was called.
 */
export async function restoreSnapshot(id: string) {
    await ethers.provider.send("evm_revert", [id]);
}

export const advanceTime = async (sec: number) => {
    const now = (await ethers.provider.getBlock("latest")).timestamp;
    await ethers.provider.send("evm_setNextBlockTimestamp", [now + sec]);
};

export const setTime = async (timestamp: number) => {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
};

export const increaseTime = async (timestamp: number) => {
    await ethers.provider.send("evm_increaseTime", [timestamp]);
};

export const mine = async () => {
    return await ethers.provider.send("evm_mine", []);
};

export const mineBlocks = async (total: number) => {
    const array = new Array(total);

    for await (const index of array) {
        await mine();
    }
};

export const getSignerFromAddress = async (address: string) => {
    await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [address],
    });

    return await ethers.provider.getSigner(address);
};
