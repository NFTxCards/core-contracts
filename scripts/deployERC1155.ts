import { ethers } from "hardhat";

async function main() {
    const [sender] = await ethers.getSigners();
    console.log("sender", sender.address);

    // We get the contract to deploy
    const Implementation = await ethers.getContractFactory("ERC11555Preset");
    const impl = await Implementation.deploy(
        "ipfs://QmYCv6XMEEYMNBf1rJkbrqTECBg8tUWbjfJVX38gVeULEj", // uri
        "0x6219dFA657520D1dfD07C2F5ce2b50f8c16BE613", // minter
    );
    await impl.deployed();
    console.log("Token deployed to:", impl.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
