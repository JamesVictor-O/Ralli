import { useCallback, useEffect, useState } from 'react'

export function useNimBalance(address: string | null) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [balance, setBalance] = useState<number | null>(null)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    if (!address) {
      setStatus('idle')
      setBalance(null)
      return
    }
    setStatus('loading')
    setError('')
    try {
      // Dynamically imported so the Nimiq light client's glue code only ships to
      // visitors who actually connect a wallet, instead of bloating every page load.
      const { fetchNimBalance } = await import('../nimiq/balance.ts')
      const value = await fetchNimBalance(address)
      setBalance(value)
      setStatus('ready')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Could not load the wallet balance.')
      setStatus('error')
    }
  }, [address])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  return { status, balance, error, refresh }
}
