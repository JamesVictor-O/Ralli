import * as Nimiq from '@nimiq/core'

export const CONSENSUS_TIMEOUT_MS = 30_000

function isTestnet() {
  const hubUrl = (import.meta.env.VITE_NIMIQ_HUB_URL as string | undefined)?.trim() ?? ''
  return hubUrl.includes('testnet')
}

export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
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
// expose balance or transaction lookups — so reading either means running Nimiq's own
// light client (WASM, "pico" sync) directly in the browser and asking the network for it.
// Shared/cached so balance reads and payment confirmation reuse the same synced client
// instead of each re-establishing consensus from scratch.
export function getNanoClient() {
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
