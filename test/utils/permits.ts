import { BigNumberish } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { network, ethers } from "hardhat";
import { signMessage } from ".";
import { ERC1155TokenMock, ERC20TokenMock, ERC721TokenMock } from "../../types";

const chainId = network.config.chainId!;

const DomainERC20 = (token: ERC20TokenMock) => ({
    name: "ERC20Permit",
    version: "1",
    chainId,
    verifyingContract: token.address,
});

const DomainERC721 = (nft: ERC721TokenMock) => ({
    name: "ERC721Permit",
    version: "1",
    chainId,
    verifyingContract: nft.address,
});

const DomainERC1155 = (multiToken: ERC1155TokenMock) => ({
    name: "ERC1155Permit",
    version: "1",
    chainId,
    verifyingContract: multiToken.address,
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

const EncodingTypesERC20 = [
    "uint256 amount",
    "uint256 deadline",
    "tuple(uint8 v, bytes32 r, bytes32 s) sig",
];

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

const EncodingTypesERC721 = [
    "bool forAll",
    "uint256 tokenId",
    "uint256 deadline",
    "tuple(uint8 v, bytes32 r, bytes32 s) sig",
];

const TypesERC1155 = {
    Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "deadline", type: "uint256" },
        { name: "nonce", type: "uint256" },
    ],
};

const EncodingTypesERC1155 = ["uint256 deadline", "tuple(uint8 v, bytes32 r, bytes32 s) sig"];

type ERC20Permit = {
    owner: string;
    spender: string;
    value: BigNumberish;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

export async function signPermitERC20(
    signer: SignerWithAddress,
    token: ERC20TokenMock,
    permit: ERC20Permit,
) {
    const sig = await signMessage(signer, DomainERC20(token), TypesERC20, permit);
    const coder = new ethers.utils.AbiCoder();
    return coder.encode(EncodingTypesERC20, [permit.value, permit.deadline, sig]);
}

type ERC721Permit = {
    owner: string;
    spender: string;
    tokenId: BigNumberish;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

export async function signPermitERC721(
    signer: SignerWithAddress,
    token: ERC721TokenMock,
    permit: ERC721Permit,
) {
    const sig = await signMessage(signer, DomainERC721(token), TypesERC721, permit);
    const coder = new ethers.utils.AbiCoder();
    return coder.encode(EncodingTypesERC721, [false, permit.tokenId, permit.deadline, sig]);
}

type ERC721PermitAll = {
    owner: string;
    spender: string;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

export async function signPermitAllERC721(
    signer: SignerWithAddress,
    token: ERC721TokenMock,
    permit: ERC721PermitAll,
) {
    const sig = await signMessage(signer, DomainERC721(token), TypesAllERC721, permit);
    const coder = new ethers.utils.AbiCoder();
    return coder.encode(EncodingTypesERC721, [true, 0, permit.deadline, sig]);
}

type ERC1155Permit = {
    owner: string;
    spender: string;
    deadline: BigNumberish;
    nonce: BigNumberish;
};

export async function signPermitERC1155(
    signer: SignerWithAddress,
    token: ERC1155TokenMock,
    permit: ERC1155Permit,
) {
    const sig = await signMessage(signer, DomainERC1155(token), TypesERC1155, permit);
    const coder = new ethers.utils.AbiCoder();
    return coder.encode(EncodingTypesERC1155, [permit.deadline, sig]);
}
