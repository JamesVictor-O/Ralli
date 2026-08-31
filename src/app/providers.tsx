import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import { listAccounts } from '../nimiq/accounts.ts'
import { getNimiqClient } from '../nimiq/client.ts'
import { WalletContext, type WalletStatus } from '../store/wallet.ts'

function friendlyError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/reject|declin|cancel|denied/i.test(message)) return 'Connection cancelled. Your wallet was not changed.'
  return 'Ralli could not reach Nimiq Pay. Please try again.'
}

export function AppProviders({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<WalletStatus>('initializing')
  const [account, setAccount] = useState<string | null>(null)
  const [consensus, setConsensus] = useState<boolean | null>(null)
  const [blockNumber, setBlockNumber] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialize = useCallback(async () => {
    if (!window.nimiqPay) {
      setStatus('unavailable')
      return
    }
    setStatus('initializing')
    setError(null)
    try {
      const client = await getNimiqClient()
      const [isReady, block] = await Promise.all([client.isConsensusEstablished(), client.getBlockNumber()])
      setConsensus(isReady)
      setBlockNumber(block)
      setStatus('ready')
    } catch (providerError) {
      setError(friendlyError(providerError))
      setStatus('error')
    }
  }, [])

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
      setStatus('connected')
    } catch (providerError) {
      setError(friendlyError(providerError))
      setStatus('ready')
    }
  }, [])

  const disconnect = useCallback(() => {
    setAccount(null)
    setStatus('ready')
    setError(null)
  }, [])

  const value = useMemo(() => ({
    status, account, consensus, blockNumber, error, connect, retry: initialize, disconnect,
  }), [status, account, consensus, blockNumber, error, connect, initialize, disconnect])

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
}
