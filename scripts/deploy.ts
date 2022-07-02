import hre, { ethers, upgrades, network } from "hardhat";

function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
    const [sender] = await ethers.getSigners();
    console.log("sender", sender.address);

    // Deployment
    const ExchangeFactory = await ethers.getContractFactory("Exchange");
    const exchange = await upgrades.deployProxy(ExchangeFactory, [
        process.env.TREASURY!,
        process.env.FEE!,
    ]);
    await exchange.deployed();
    console.log("Exchange (proxy) deployed to:", exchange.address);

    const proxyAdmin = await upgrades.admin.getInstance();
    const impl = await proxyAdmin.getProxyImplementation(exchange.address);
    console.log("Exchange (implementation) at:", impl);

    // Verification
    if (network.name !== "localhost" && network.name !== "hardhat") {
        console.log("Sleeping before verification...");
        await sleep(20000);

        // await hre.run("verify:verify", {
        //     address: impl.address,
        // });
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
