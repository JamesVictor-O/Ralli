import { getNimiqClient } from './client.ts'
import { getNimiqHub, isNimiqPayContext } from './hub.ts'
import { isNimiqError } from './types.ts'

export const LUNA_PER_NIM = 100_000
export const WALLET_BALANCE_CHANGED_EVENT = 'ralli:wallet-balance-changed'

function announceBalanceChanged() {
  window.dispatchEvent(new Event(WALLET_BALANCE_CHANGED_EVENT))
}

export interface NimPayment {
  recipient: string
  amountNim: string
  message?: string
}

export function nimToLuna(amount: string) {
  const numericAmount = Number(amount)
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) throw new Error('Enter a NIM amount greater than zero.')
  const luna = Math.round(numericAmount * LUNA_PER_NIM)
  if (!Number.isSafeInteger(luna)) throw new Error('That amount is too large.')
  return luna
}

export async function sendNimPayment({ recipient, amountNim, message }: NimPayment) {
  if (!recipient.trim()) throw new Error('This payment recipient has not been configured.')
  if (!isNimiqPayContext()) {
    const transaction = await getNimiqHub().checkout({
      appName: 'Ralli',
      recipient,
      value: nimToLuna(amountNim),
      extraData: message,
    })
    announceBalanceChanged()
    return transaction.hash
  }
  const client = await getNimiqClient()
  const transaction = message
    ? await client.sendBasicTransactionWithData({ recipient, value: nimToLuna(amountNim), data: message })
    : await client.sendBasicTransaction({ recipient, value: nimToLuna(amountNim) })
  if (isNimiqError(transaction)) throw new Error(transaction.error.message)
  announceBalanceChanged()
  return transaction
}
