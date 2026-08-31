import { getNimiqClient } from './client.ts'
import { isNimiqError } from './types.ts'

export async function listAccounts() {
  const client = await getNimiqClient()
  const result = await client.listAccounts()
  if (isNimiqError(result)) throw new Error(result.error.message)
  return result
}
