import { corsHeaders, json } from '../_shared/http.ts'
import { requireUser } from '../_shared/auth.ts'
import { normalizeNimiqAddress } from '../_shared/nimiq.ts'

type PaymentBody = {
  kind?: 'creator_reward' | 'boost' | 'tip'
  ralliId?: string
  responseId?: string
  amountLuna?: number
  transactionHash?: string
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return json({ error: 'Origin is not allowed.' }, 403, {})
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers)

  try {
    const { user, admin } = await requireUser(request)
    const body = await request.json().catch(() => null) as PaymentBody | null
    if (!body?.kind || !Number.isSafeInteger(body.amountLuna) || body.amountLuna! <= 0 || !body.transactionHash?.trim()) {
      return json({ error: 'The payment receipt is incomplete.' }, 400, headers)
    }

    const { data: sender } = await admin.from('profiles').select('nimiq_address, nimiq_address_verified_at').eq('id', user.id).single()
    if (!sender?.nimiq_address_verified_at || !sender.nimiq_address) return json({ error: 'Verify your Nimiq address first.' }, 403, headers)

    if (body.kind === 'tip') {
      if (!body.responseId) return json({ error: 'Choose a response to tip.' }, 400, headers)
      const { data: response } = await admin.from('responses').select('author_id').eq('id', body.responseId).single()
      if (!response || response.author_id === user.id) return json({ error: 'You cannot tip this response.' }, 400, headers)
      const { data: recipient } = await admin.from('profiles').select('nimiq_address, nimiq_address_verified_at').eq('id', response.author_id).single()
      if (!recipient?.nimiq_address_verified_at || !recipient.nimiq_address) return json({ error: 'This creator has no verified tip address.' }, 409, headers)
      const { error } = await admin.from('response_tips').insert({
        response_id: body.responseId, sender_id: user.id, recipient_id: response.author_id,
        amount_luna: body.amountLuna, transaction_hash: body.transactionHash, status: 'pending',
      })
      if (error) throw error
    } else {
      if (!body.ralliId) return json({ error: 'Choose a Ralli to fund.' }, 400, headers)
      const custodyAddress = Deno.env.get('RALLI_REWARD_ADDRESS')
      if (!custodyAddress) throw new Error('CUSTODY_NOT_CONFIGURED')
      normalizeNimiqAddress(custodyAddress)
      const { data: ralli } = await admin.from('rallis').select('id, creator_id').eq('id', body.ralliId).single()
      if (!ralli || (body.kind === 'creator_reward' && ralli.creator_id !== user.id)) return json({ error: 'This funding action is not allowed.' }, 403, headers)
      const { error } = await admin.from('pool_contributions').insert({
        ralli_id: body.ralliId, contributor_id: user.id, kind: body.kind,
        amount_luna: body.amountLuna, transaction_hash: body.transactionHash, status: 'pending',
      })
      if (error) throw error
    }
    return json({ recorded: true, status: 'pending' }, 202, headers)
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') return json({ error: 'Authentication is required.' }, 401, headers)
    if (error instanceof Error && error.message === 'CUSTODY_NOT_CONFIGURED') return json({ error: 'Reward custody is not configured.' }, 503, headers)
    console.error('payment-submission failed', error)
    return json({ error: 'The payment was sent but its receipt could not be recorded. Contact support with the transaction reference.' }, 500, headers)
  }
})
