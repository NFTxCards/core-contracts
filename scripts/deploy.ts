import { ethers } from 'hardhat'

async function main() {
  const [sender] = await ethers.getSigners()
  console.log('sender', sender.address)

  // We get the contract to deploy
  const Implementation = await ethers.getContractFactory('Exchange')
  const impl = await Implementation.deploy({ gasLimit: 2000000 })
  await impl.deployed()
  console.log('Exchange deployed to:', impl.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
