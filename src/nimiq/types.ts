import type { init } from '@nimiq/mini-app-sdk'
import type { ErrorResponse } from '@nimiq/mini-app-sdk'

export type NimiqClient = Awaited<ReturnType<typeof init>>

export interface NimiqAccount {
  address: string
  label?: string
}

export function isNimiqError(value: unknown): value is ErrorResponse {
  return typeof value === 'object' && value !== null && 'error' in value
}
