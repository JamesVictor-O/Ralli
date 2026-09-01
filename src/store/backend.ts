import { createContext, useContext } from 'react'
import type { User } from '@supabase/supabase-js'

export type BackendStatus = 'initializing' | 'ready' | 'demo' | 'error'

export interface BackendState {
  status: BackendStatus
  user: User | null
  error: string | null
  retry: () => Promise<void>
}

export const BackendContext = createContext<BackendState | null>(null)

export function useBackend() {
  const context = useContext(BackendContext)
  if (!context) throw new Error('useBackend must be used inside BackendProvider.')
  return context
}
