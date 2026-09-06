import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import type { NimiqClient } from '../nimiq/types.ts'
import { listAccounts } from '../nimiq/accounts.ts'
import { getNimiqClient } from '../nimiq/client.ts'
import { isNimiqPayContext } from '../nimiq/hub.ts'
import { WalletContext, type WalletStatus } from '../store/wallet.ts'

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const walletName = isNimiqPayContext() ? 'Nimiq Pay' : 'Nimiq Hub'
  if (/reject|declin|cancel|denied/i.test(message)) return 'Connection cancelled. Your wallet was not changed.'
  if (/not injected|inside a Nimiq app|timed?\s*out/i.test(message)) {
    return 'Open Ralli from the Mini Apps section inside Nimiq Pay, then try again.'
  }
  if (/consensus|network|fetch|offline/i.test(message)) {
    return `${walletName} could not reach the network. Check your connection and try again.`
  }
  return message && message !== '[object Object]'
    ? `${walletName} returned: ${message}`
    : 'Ralli could not connect to your Nimiq account. Please try again.'
}

export function AppProviders({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<WalletStatus>('initializing')
  const [account, setAccount] = useState<string | null>(() => window.localStorage.getItem('ralli-nimiq-address'))
  const [consensus, setConsensus] = useState<boolean | null>(null)
  const [blockNumber, setBlockNumber] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshNetworkStatus = useCallback(async (client: NimiqClient) => {
    const [consensusResult, blockResult] = await Promise.allSettled([
      client.isConsensusEstablished(),
      client.getBlockNumber(),
    ])

    if (consensusResult.status === 'fulfilled') setConsensus(consensusResult.value)
    if (blockResult.status === 'fulfilled') setBlockNumber(blockResult.value)
  }, [])

  const initialize = useCallback(async () => {
    if (!isNimiqPayContext()) {
      setStatus(window.localStorage.getItem('ralli-nimiq-address') ? 'connected' : 'ready')
      return
    }
    setStatus('initializing')
    setError(null)
    try {
      const client = await getNimiqClient()
      setStatus('ready')
      void refreshNetworkStatus(client)
    } catch (providerError) {
      console.error('Nimiq Pay initialization failed', providerError)
      setError(friendlyError(providerError))
      setStatus('error')
    }
  }, [refreshNetworkStatus])

  useEffect(() => {
    void Promise.resolve().then(initialize)
  }, [initialize])

  const connect = useCallback(async () => {
    setStatus('connecting')
    setError(null)
    try {
      const accounts = await listAccounts()
      if (!accounts.length) {
        setError('No Nimiq account was selected.')
        setStatus('ready')
        return
      }
      setAccount(accounts[0])
      window.localStorage.setItem('ralli-nimiq-address', accounts[0])
      setStatus('connected')
      if (isNimiqPayContext()) {
        const client = await getNimiqClient()
        void refreshNetworkStatus(client)
      }
    } catch (providerError) {
      console.error('Nimiq account connection failed', providerError)
      setError(friendlyError(providerError))
      setStatus('ready')
    }
  }, [refreshNetworkStatus])

  const disconnect = useCallback(() => {
    setAccount(null)
    window.localStorage.removeItem('ralli-nimiq-address')
    setStatus('ready')
    setError(null)
  }, [])

  const value = useMemo(() => ({
    status, account, consensus, blockNumber, error, connect, retry: initialize, disconnect,
  }), [status, account, consensus, blockNumber, error, connect, initialize, disconnect])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
