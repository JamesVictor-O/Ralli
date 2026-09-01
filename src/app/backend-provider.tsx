import { type PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { ensureAnonymousSession } from '../lib/auth.ts'
import { isSupabaseConfigured, supabase } from '../lib/supabase.ts'
import { BackendContext, type BackendStatus } from '../store/backend.ts'

export function BackendProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<BackendStatus>(isSupabaseConfigured ? 'initializing' : 'demo')
  const [user, setUser] = useState<User | null>(null)
  const [error, setError] = useState<string | null>(null)

  const initialize = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setStatus('demo')
      return
    }

    setStatus('initializing')
    setError(null)
    try {
      const authenticatedUser = await ensureAnonymousSession()
      setUser(authenticatedUser)
      setStatus('ready')
    } catch (failure) {
      console.error('Supabase session initialization failed', failure)
      setError(failure instanceof Error ? failure.message : 'Ralli could not start its data session.')
      setStatus('error')
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(initialize)
    if (!supabase) return

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) setStatus('ready')
    })
    return () => data.subscription.unsubscribe()
  }, [initialize])

  const value = useMemo(() => ({ status, user, error, retry: initialize }), [status, user, error, initialize])
  return <BackendContext.Provider value={value}>{children}</BackendContext.Provider>
}
