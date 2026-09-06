import { FunctionsHttpError } from '@supabase/supabase-js'
import { requireSupabase } from './supabase.ts'

export async function recordPaymentSubmission(body: {
  kind: 'creator_reward' | 'boost' | 'tip'
  ralliId?: string
  responseId?: string
  amountLuna: number
  transactionHash: string
}) {
  const { data, error } = await requireSupabase().functions.invoke<{ recorded: boolean; status: 'pending' }>('payment-submission', { body })
  if (error) {
    if (error instanceof FunctionsHttpError) {
      const payload = await error.context.json().catch(() => null) as { error?: string } | null
      if (payload?.error) throw new Error(payload.error)
    }
    throw error
  }
  return data
}
