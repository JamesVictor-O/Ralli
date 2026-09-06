import { useCallback, useEffect, useState } from 'react'
import { fetchRalliFeed } from '../lib/rallis.ts'
import { useBackend } from '../store/backend.ts'
import type { Dare } from '../features/discover/DareCard.tsx'

export type FeedStatus = 'loading' | 'success' | 'empty' | 'error' | 'demo'

export function useRalliFeed(demoRallis: Dare[], refreshKey = 0) {
  const backend = useBackend()
  const [rallis, setRallis] = useState<Dare[]>(backend.status === 'demo' ? demoRallis : [])
  const [status, setStatus] = useState<FeedStatus>(backend.status === 'demo' ? 'demo' : 'loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    void refreshKey
    if (backend.status === 'demo') {
      setRallis(demoRallis)
      setStatus('demo')
      return
    }
    if (backend.status !== 'ready') return

    setStatus('loading')
    setError(null)
    try {
      const nextRallis = await fetchRalliFeed()
      setRallis(nextRallis)
      setStatus(nextRallis.length ? 'success' : 'empty')
    } catch (failure) {
      console.error('Ralli feed request failed', failure)
      setError(failure instanceof Error ? failure.message : 'The Ralli feed could not be loaded.')
      setStatus('error')
    }
  }, [backend.status, demoRallis, refreshKey])

  useEffect(() => {
    void Promise.resolve().then(load)
  }, [load])

  return { rallis, status, error, retry: load }
}
