import { createContext, useContext } from 'react'

export type WalletStatus = 'initializing' | 'ready' | 'connecting' | 'connected' | 'unavailable' | 'error'

export interface WalletContextValue {
  status: WalletStatus
  account: string | null
  consensus: boolean | null
  blockNumber: number | null
  error: string | null
  connect: () => Promise<void>
  retry: () => Promise<void>
  disconnect: () => void
  // Bumped whenever a mobile Nimiq Hub redirect finishes an address verification, so
  // useWalletVerification knows to re-check the profile even though the component that
  // started the verification was unmounted by the full-page redirect round trip.
  verificationTick: number
}

export const WalletContext = createContext<WalletContextValue | null>(null)

export function useWallet() {
  const value = useContext(WalletContext)
  if (!value) throw new Error('useWallet must be used inside AppProviders.')
  return value
}
