import * as Nimiq from '@nimiq/core'
import { LUNA_PER_NIM } from './payments.ts'

const CONSENSUS_TIMEOUT_MS = 30_000

function isTestnet() {
  const hubUrl = (import.meta.env.VITE_NIMIQ_HUB_URL as string | undefined)?.trim() ?? ''
  return hubUrl.includes('testnet')
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms)
    promise.then(
      (value) => { window.clearTimeout(timer); resolve(value) },
      (error: unknown) => { window.clearTimeout(timer); reject(error instanceof Error ? error : new Error(String(error))) },
    )
  })
}

let clientPromise: Promise<Nimiq.Client> | null = null

// Neither @nimiq/hub-api (signing/accounts) nor @nimiq/mini-app-sdk (Nimiq Pay bridge)
// expose a balance lookup — so reading a balance means running Nimiq's own light
// client (WASM, "pico" sync) directly in the browser and asking the network for it.
function getNanoClient() {
  clientPromise ??= (async () => {
    const config = new Nimiq.ClientConfiguration()
    if (isTestnet()) {
      config.network('TestAlbatross')
      config.seedNodes([
        '/dns4/seed1.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed2.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed3.pos.nimiq-testnet.com/tcp/8443/wss',
        '/dns4/seed4.pos.nimiq-testnet.com/tcp/8443/wss',
      ])
    }
    return Nimiq.Client.create(config.build())
  })()
  return clientPromise
}

export async function fetchNimBalance(address: string) {
  const client = await getNanoClient()
  await withTimeout(client.waitForConsensusEstablished(), CONSENSUS_TIMEOUT_MS, 'Could not sync with the Nimiq network in time.')
  const account = await client.getAccount(address)
  return account.balance / LUNA_PER_NIM
}
