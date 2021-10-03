import { ethers } from 'hardhat'
import { signTypedData, SignTypedDataVersion } from '@metamask/eth-sig-util'
import { toBuffer } from 'ethereumjs-util';

import { restoreSnapshot, mineBlocks, takeSnapshot, getRSVFromSign, getVerifyMessageParams } from './utils'

import { Verifier } from '../types'
import { expect } from 'chai'

describe('Verifier contract', function() {
  let verifier: Verifier
  let badSender: any
  let sender: any
  let snapshotId: string

  const senderPrivateKey = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'

  before(async function() {
    ;[sender, badSender] = await ethers.getSigners()

    const Verifier = await ethers.getContractFactory('Verifier')
    // @ts-ignore
    verifier = await Verifier.deploy()
    await verifier.deployed()

    snapshotId = await takeSnapshot()
  })

  afterEach(async () => {
    await restoreSnapshot(snapshotId)
    snapshotId = await takeSnapshot()
  })

  describe('verify', () => {
    it('should be success: verify address', async function() {
      const params = await getVerifyMessageParams(verifier.address, sender.address)

      const signMessage = signTypedData({
        privateKey: toBuffer(senderPrivateKey),
        // @ts-ignore typing error
        data: params,
        version: SignTypedDataVersion.V4,
      })

      const { v, r, s } = getRSVFromSign(signMessage)

      await verifier.callStatic.verify(v, r, s, sender.address, params.message.deadline)
    })

    it('should be failed: signed transaction expired', async function() {
      const params = await getVerifyMessageParams(verifier.address, sender.address)

      const signMessage = signTypedData({
        privateKey: toBuffer(senderPrivateKey),
        // @ts-ignore typing error
        data: params,
        version: SignTypedDataVersion.V4,
      })

      const { v, r, s } = getRSVFromSign(signMessage)

      let assertReason = ''

      await mineBlocks(100) // hardhat has 3sec block time

      try {
        await verifier.callStatic.verify(v, r, s, sender.address, params.message.deadline)
      } catch (err) {
        assertReason = err.message;
      }

      expect(assertReason).to.includes('signed transaction expired')
    })

    it('should be failed: verify invalid signature', async function() {
      const params = await getVerifyMessageParams(verifier.address, sender.address)

      const signMessage = signTypedData({
        privateKey: toBuffer(senderPrivateKey),
        // @ts-ignore typing error
        data: params,
        version: SignTypedDataVersion.V4,
      })

      const { v, r, s } = getRSVFromSign(signMessage)

      let assertReason = ''

      try {
        await verifier.callStatic.verify(v, r, s, badSender.address, params.message.deadline)
      } catch (err) {
        assertReason = err.message;
      }

      expect(assertReason).to.includes('verify invalid signature')
    })

  })
})
