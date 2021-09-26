import hre, { ethers } from 'hardhat'

/**
 *  Takes a snapshot and returns the ID of the snapshot for restoring later.
 * @returns {string} id
 */
export async function takeSnapshot(): Promise<string> {
  return await ethers.provider.send('evm_snapshot', [])
}

export function generateAddress() {
  return ethers.utils.getAddress(
    ethers.utils.hexlify(ethers.utils.randomBytes(20)).substr(2).padStart(40, '0'),
  )
}

export function generateSendParams(amount: number): { id: number; addr: string }[] {
  const _recipient = []

  for (let i = 0; i < amount; i++) {
    _recipient.push({
      addr: generateAddress(),
      id: i + 1,
    })
  }

  return _recipient
}

export function generateSendParams1155(amount: number) {
  const _recipient = []

  for (let i = 0; i < amount; i++) {
    _recipient.push({
      addr: generateAddress(),
      id: i + 1,
      amount: 1,
    })
  }

  return _recipient
}

/**
 *  Restores a snapshot that was previously taken with takeSnapshot
 *  @param {string} id The ID that was returned when takeSnapshot was called.
 */
export async function restoreSnapshot(id: string) {
  await ethers.provider.send('evm_revert', [id])
}

export const advanceTime = async (sec: number) => {
  const now = (await ethers.provider.getBlock('latest')).timestamp
  await ethers.provider.send('evm_setNextBlockTimestamp', [now + sec])
}

export const setTime = async (timestamp: number) => {
  await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp])
}

export const getSignerFromAddress = async (address: string) => {
  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [address],
  })

  return await ethers.provider.getSigner(address)
}
