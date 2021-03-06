import { ethers } from "hardhat";

const EXCHANGE_PROXY_ADDRESS = '0x3478B2CC9e63df6DE64176665852AE081f6370D1'
const ERC721_ADDRESS = ''
const ERC1155_ADDRESS = '0xfBDd0F8E4eF9Aca0Ab8ac77A0df1Ebc8a45e23f5'

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
  await exchange.setTradeInfoERC1155(
    ERC1155_ADDRESS,          // address token,
    [0,1,2,3,4,5,6,7,8,9,10],   // uint256[] memory ids,
    new Array(10).fill(true), // bool[] memory enabled,
    new Array(10).fill(ethers.utils.parseEther('0.01')),    // uint256[] memory prices,
    new Array(10).fill(20),   // uint256[] memory amounts
  )
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
  // await buyToken()
  await setTradeInfoERC1155()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
