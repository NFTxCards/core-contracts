import { ethers } from "hardhat";

async function main() {
    const [sender] = await ethers.getSigners();
    console.log("sender", sender.address);

    // We get the contract to deploy
    const Implementation = await ethers.getContractFactory("ERC721Preset");
    const impl = await Implementation.deploy(
      'Mock', // name
      'MCKX', // symbol
      'https://gateway.pinata.cloud/ipfs/QmeBcHF1fERCifWmhUrH9Lgeg763VJRyVTP59nQjpFuKAW', // uri
      '0x79042E860363e51fd26Ae668632d1E614aE66C15', // minter
      '250', // royalty
    );
    await impl.deployed();
    console.log("Exchange deployed to:", impl.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
