import { ethers } from "hardhat";

const EXCHANGE_PROXY_ADDRESS = '0x6219dFA657520D1dfD07C2F5ce2b50f8c16BE613'
const ERC721_ADDRESS = '0x96d13467B1bAf2474AAfB53d4b787679C71c8f8B'
const ERC1155_ADDRESS = ''

async function setTradeInfoERC721() {
  const [sender] = await ethers.getSigners();

  // exchange proxy address
  let exchange = await ethers.getContractAt('Exchange', EXCHANGE_PROXY_ADDRESS)
  exchange = exchange.connect(sender)
  // token contracts, enabled, price
  await exchange.setTradeInfoERC721(ERC721_ADDRESS, true, ethers.utils.parseEther('0.02'))
}

async function setTradeInfoERC1155() {
  const [sender] = await ethers.getSigners();

  // exchange proxy address
  let exchange = await ethers.getContractAt('Exchange', EXCHANGE_PROXY_ADDRESS)
  exchange = exchange.connect(sender)
  // token contracts, id token, enabled, price
  await exchange.setTradeInfoERC1155(ERC1155_ADDRESS, 1, true, ethers.utils.parseEther('0.02'))
}

async function buyToken() {
  const [sender] = await ethers.getSigners();

  let exchange = await ethers.getContractAt('Exchange', EXCHANGE_PROXY_ADDRESS)
  exchange = exchange.connect(sender)

  const params = {
    id: 1,
    token: ERC721_ADDRESS,
    amount: 1,
    assetType: 1,
  }

  // id,contract, amount, ERC721 - 1; ERC1155 - 2
  await exchange.buy([params.id, ERC721_ADDRESS, params.amount, params.assetType], {
    value: ethers.utils.parseEther('0.02')
  })
}

async function main() {
  // await setTradeInfoERC721()
  await buyToken()
  // await setTradeInfoERC1155()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
