import { useCallback, useEffect, useState } from 'react'
import { fetchRalliPresence, fetchTodaysRalli, type RalliPresence } from '../lib/rallis.ts'
import { hasResponded } from '../lib/responses.ts'
import { useBackend } from '../store/backend.ts'
import type { Dare } from '../features/discover/DareCard.tsx'

export type TodaysRalliStatus = 'loading' | 'ready' | 'empty' | 'error'

export function useTodaysRalli(refreshKey = 0) {
  const { status: backendStatus, user } = useBackend()
  const [ralli, setRalli] = useState<Dare | null>(null)
  const [responded, setResponded] = useState(false)
  const [presence, setPresence] = useState<RalliPresence | null>(null)
  const [status, setStatus] = useState<TodaysRalliStatus>('loading')

  const load = useCallback(async () => {
    void refreshKey
    if (backendStatus !== 'ready') return
    setStatus('loading')
    try {
      const today = await fetchTodaysRalli()
      setRalli(today)
      if (!today) { setStatus('empty'); return }

      const joined = user ? await hasResponded(today.id, user.id) : false
      setResponded(joined)
      setPresence(joined ? null : await fetchRalliPresence(today.id))
      setStatus('ready')
    } catch (failure) {
      console.error('Today’s Ralli request failed', failure)
      setStatus('error')
    }
  }, [backendStatus, user, refreshKey])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  return { ralli, responded, presence, status, retry: load }
}
