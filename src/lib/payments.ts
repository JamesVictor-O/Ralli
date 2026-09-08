import { FunctionsHttpError } from '@supabase/supabase-js'
import { requireSupabase } from './supabase.ts'
import { waitForTransactionConfirmation } from '../nimiq/transactions.ts'

async function invokeOrThrow<T>(name: string, body: Record<string, unknown>) {
  const { data, error } = await requireSupabase().functions.invoke<T>(name, { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null) as { error?: string } | null
      if (payload?.error) throw new Error(payload.error)
    }
    throw error
  }
  return data as T
}

export async function recordPaymentSubmission(body: {
  kind: 'creator_reward' | 'boost' | 'tip'
  ralliId?: string
  responseId?: string
  amountLuna: number
  transactionHash: string
}) {
  return invokeOrThrow<{ recorded: boolean; status: 'pending' }>('payment-submission', body)
}

// A submitted payment sits as 'pending' forever unless something confirms it — this is that
// something. Waits for the transaction to settle on-chain (via the browser's own Nimiq light
// client, the same one used for balance reads) then asks the server to cross-check and flip
// the row to 'confirmed'. Called right after recordPaymentSubmission, with the same details.
export async function confirmPayment(body: {
  kind: 'creator_reward' | 'boost' | 'tip'
  transactionHash: string
}) {
  const settled = await waitForTransactionConfirmation(body.transactionHash)
  return invokeOrThrow<{ confirmed: boolean; alreadyConfirmed?: boolean }>('confirm-payment', {
    kind: body.kind,
    transactionHash: body.transactionHash,
    sender: settled.sender,
    recipient: settled.recipient,
    valueLuna: settled.valueLuna,
    state: settled.state,
  })
}
