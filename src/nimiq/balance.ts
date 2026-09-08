import { LUNA_PER_NIM } from './payments.ts'
import { CONSENSUS_TIMEOUT_MS, getNanoClient, withTimeout } from './nanoClient.ts'

export async function fetchNimBalance(address: string) {
  const client = await getNanoClient()
  await withTimeout(client.waitForConsensusEstablished(), CONSENSUS_TIMEOUT_MS, 'Could not sync with the Nimiq network in time.')
  const account = await client.getAccount(address)
  return account.balance / LUNA_PER_NIM
}
