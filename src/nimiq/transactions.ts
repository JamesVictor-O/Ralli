import { CONSENSUS_TIMEOUT_MS, getNanoClient, withTimeout } from './nanoClient.ts'

export interface ConfirmedTransaction {
  sender: string
  recipient: string
  valueLuna: number
  state: string
}

const POLL_INTERVAL_MS = 3_000
const CONFIRM_TIMEOUT_MS = 90_000
const SETTLED_STATES = new Set(['included', 'confirmed'])
const DEAD_STATES = new Set(['invalidated', 'expired'])

// Polls the light client for a transaction's on-chain state until it's settled enough to
// trust (see confirm-payment's comment for why this, and not a server-side check, is the
// verification path). "included" is accepted alongside "confirmed" — Albatross's macro-block
// finality can take longer than this app needs to wait for a tip/boost counter to update.
export async function waitForTransactionConfirmation(hash: string): Promise<ConfirmedTransaction> {
  const client = await getNanoClient()
  await withTimeout(client.waitForConsensusEstablished(), CONSENSUS_TIMEOUT_MS, 'Could not sync with the Nimiq network in time.')

  const deadline = Date.now() + CONFIRM_TIMEOUT_MS
  for (;;) {
    const details = await client.getTransaction(hash)
    if (SETTLED_STATES.has(details.state)) {
      return { sender: details.sender, recipient: details.recipient, valueLuna: details.value, state: details.state }
    }
    if (DEAD_STATES.has(details.state)) throw new Error('This transaction did not go through — it was invalidated or expired.')
    if (Date.now() >= deadline) throw new Error('This transaction is still pending on the network. It will confirm on its own — check back shortly.')
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS))
  }
}
