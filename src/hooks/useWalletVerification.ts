import { useCallback, useEffect, useState } from 'react'
import { requireSupabase } from '../lib/supabase.ts'
import { verifyConnectedNimiqAddress } from '../nimiq/signatures.ts'
import { useBackend } from '../store/backend.ts'

export type WalletVerificationStatus = 'idle' | 'checking' | 'unverified' | 'verifying' | 'verified' | 'error'

function sameAddress(left: string | null, right: string) {
  return left?.replace(/\s/g, '').toUpperCase() === right.replace(/\s/g, '').toUpperCase()
}

export function useWalletVerification(account: string | null) {
  const { status: backendStatus, user } = useBackend()
  const [status, setStatus] = useState<WalletVerificationStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!account || backendStatus !== 'ready' || !user) {
      setStatus('idle')
      return
    }
    setStatus('checking')
    setError(null)
    const { data, error: profileError } = await requireSupabase()
      .from('profiles')
      .select('nimiq_address, nimiq_address_verified_at')
      .eq('id', user.id)
      .single()
    if (profileError) {
      setError('Ralli could not check this wallet yet. Please try again.')
      setStatus('error')
      return
    }
    setStatus(data.nimiq_address_verified_at && sameAddress(data.nimiq_address, account) ? 'verified' : 'unverified')
  }, [account, backendStatus, user])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  const verify = useCallback(async () => {
    if (!account) return
    setStatus('verifying')
    setError(null)
    try {
      await verifyConnectedNimiqAddress(account)
      setStatus('verified')
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Wallet verification failed.'
      setError(/reject|declin|cancel|denied/i.test(message) ? 'Verification cancelled. Nothing was changed.' : message)
      setStatus('error')
    }
  }, [account])

  return { status, error, verify, refresh }
}
