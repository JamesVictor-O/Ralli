import { getNimiqClient } from './client.ts'
import { getNimiqHub, isNimiqPayContext } from './hub.ts'
import { isNimiqError } from './types.ts'

export async function listAccounts() {
  if (!isNimiqPayContext()) {
    const selected = await getNimiqHub().chooseAddress({ appName: 'Ralli' })
    return [selected.address]
  }
  const client = await getNimiqClient()
  const result = await client.listAccounts()
  if (isNimiqError(result)) throw new Error(result.error.message)
  return result
}
