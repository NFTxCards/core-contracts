import { ethers } from "hardhat";

async function main() {
    const [sender] = await ethers.getSigners();
    console.log("sender", sender.address);

    // We get the contract to deploy
    // const Implementation = await ethers.getContractFactory("ERC721Preset");
    // const impl = await Implementation.deploy(
    //   'Mock', // name
    //   'MCKX', // symbol
    //   'https://gateway.pinata.cloud/ipfs/QmeBcHF1fERCifWmhUrH9Lgeg763VJRyVTP59nQjpFuKAW', // uri
    //   '0x9Aaa6f34E13830FC7216DA90b3c99E02b4cCaBA9', // minter
    //   '250', // royalty
    // );
    // await impl.deployed();
    // console.log("Token deployed to:", impl.address);

    let token = await ethers.getContractAt('ERC721Preset', '0xea4a161aae8E459213456590629c0341c821cb9F')

    token = token.connect(sender)

    const balance = await token.callStatic.balanceOf('0xF39598EF3e216cf052a45dA5f163D2b4bD21469E')
    console.log('balance', balance)

  const owner = await token.callStatic.ownershipOf('1')
  console.log('owner', owner)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
