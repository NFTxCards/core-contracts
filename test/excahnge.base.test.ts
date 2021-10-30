import { ethers } from 'hardhat'
import { expect } from 'chai'

import {
  takeSnapshot,
  restoreSnapshot,
} from './utils'

import { ERC721TokenMock, Exchange } from '../types'

describe('Exchange contract', function () {
  let auction: Exchange
  let token: ERC721TokenMock
  let recipient: any
  let sender: any
  let snapshotId: string

  before(async function () {
    ;[sender, recipient] = await ethers.getSigners()

    const Auction = await ethers.getContractFactory('Exchange')
    // @ts-ignore
    auction = await Auction.deploy()
    await auction.deployed()

    const TokenMock = await ethers.getContractFactory('ERC721TokenMock')
    // @ts-ignore
    token = await TokenMock.deploy()
    await token.deployed()

    snapshotId = await takeSnapshot()
  })

  afterEach(async () => {
    await restoreSnapshot(snapshotId)
    snapshotId = await takeSnapshot()
  })

  describe('Order', () => {
    it('should be success: create & fill order', async function () {
      await token.multipleAwardItem(sender.address, 10)

      const tokenPrice = ethers.utils.parseEther('0.1')

      token = token.connect(sender)
      await token.setApprovalForAll(auction.address, true)

      const senderContract = auction.connect(sender)

      const receipt = await senderContract.createOrder({
        token: token.address,
        tokenId: 1,
        price: tokenPrice,
        expirationTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3,
        salt: Date.now(),
      })
      const order = await receipt.wait()

      const senderBalanceBefore = await ethers.provider.getBalance(sender.address)

      // @ts-ignore
      const result = await auction.callStatic.getOrderFromHash(order.events[0].args.orderHash)

      const recipientContract = auction.connect(recipient)
      await recipientContract.fillOrder(result, {
        value: tokenPrice
      })

      const ownerToken = await token.ownerOf(1)
      expect(ownerToken).to.be.eq(recipient.address)

      const senderBalanceAfter = await ethers.provider.getBalance(sender.address)

      expect(senderBalanceBefore.add(tokenPrice).toString()).to.be.eq(senderBalanceAfter.toString())
    })

    it('should be failed: only owner token can create order', async function () {
      await token.multipleAwardItem(recipient.address, 10)

      const tokenPrice = ethers.utils.parseEther('0.1')

      const senderContract = auction.connect(sender)

      let assertReason = ''

      try {
        await senderContract.createOrder({
          token: token.address,
          tokenId: 1,
          price: tokenPrice,
          expirationTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3,
          salt: Date.now(),
        })
      } catch (err) {
        assertReason = err.message
      }

      expect(assertReason.includes('Only owner token can create order')).to.be.true
    })

    it('should be failed: not enough money', async function () {
      await token.multipleAwardItem(sender.address, 10)

      const tokenPrice = ethers.utils.parseEther('0.1')

      token = token.connect(sender)
      await token.setApprovalForAll(auction.address, true)

      const senderContract = auction.connect(sender)

      const receipt = await senderContract.createOrder({
        token: token.address,
        tokenId: 1,
        price: tokenPrice,
        expirationTime: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 3,
        salt: Date.now(),
      })
      const order = await receipt.wait()

      // @ts-ignore
      const result = await auction.callStatic.getOrderFromHash(order.events[0].args.orderHash)

      let assertReason = ''

      try {
        const recipientContract = auction.connect(recipient)
        await recipientContract.fillOrder(result, {
          value: tokenPrice.sub(ethers.utils.parseEther('0.01'))
        })
      } catch (err) {
        assertReason = err.message
      }

      expect(assertReason.includes('Not enough money')).to.be.true
    })
  })
})
