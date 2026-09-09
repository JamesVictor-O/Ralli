import { corsHeaders, json } from '../_shared/http.ts'
import { requireUser } from '../_shared/auth.ts'
import { normalizeNimiqAddress } from '../_shared/nimiq.ts'

// There's no way to independently re-verify a transaction against the Nimiq network from
// here: Supabase Edge Functions can't run @nimiq/core's client (it needs node:worker_threads,
// which this runtime doesn't implement — confirmed by hand before building this), and Nimiq
// doesn't publish a public hosted RPC endpoint to call over plain HTTP instead. So the browser
// (which already runs a working light client for balance reads, see src/nimiq/balance.ts)
// looks the transaction up on-chain itself and reports what it found. This function's job is
// to make sure that report is *consistent* with what was recorded at submission time — right
// kind of proof (an authenticated, previously-verified sender), right recipient, right amount,
// a real on-chain state — before trusting it. Good enough for a testnet social app; a self-hosted
// node would be the next step up if this ever needed to be adversarial-proof.
type ConfirmBody = {
  kind?: 'creator_reward' | 'boost' | 'tip'
  transactionHash?: string
  sender?: string
  recipient?: string
  valueLuna?: number
  state?: string
}

const GOOD_STATES = new Set(['included', 'confirmed'])

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return json({ error: 'Origin is not allowed.' }, 403, {})
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers)

  try {
    const { user, admin } = await requireUser(request)
    const body = await request.json().catch(() => null) as ConfirmBody | null
    if (!body?.kind || !body.transactionHash?.trim() || !body.sender?.trim() || !body.recipient?.trim()
      || !Number.isSafeInteger(body.valueLuna) || body.valueLuna! <= 0 || !body.state) {
      return json({ error: 'The confirmation report is incomplete.' }, 400, headers)
    }
    if (!GOOD_STATES.has(body.state)) return json({ error: `Transaction is not yet settled (state: ${body.state}).` }, 409, headers)

    const { data: payer } = await admin.from('profiles').select('nimiq_address, nimiq_address_verified_at').eq('id', user.id).single()
    if (!payer?.nimiq_address_verified_at || !payer.nimiq_address) return json({ error: 'Verify your Nimiq address first.' }, 403, headers)
    if (normalizeNimiqAddress(payer.nimiq_address) !== normalizeNimiqAddress(body.sender)) {
      return json({ error: 'This transaction was not sent from your verified address.' }, 403, headers)
    }

    const hash = body.transactionHash.trim()
    const reportedRecipient = normalizeNimiqAddress(body.recipient)

    if (body.kind === 'tip') {
      const { data: tip } = await admin.from('response_tips').select('id, status, recipient_id, response_id, amount_luna')
        .eq('transaction_hash', hash).eq('sender_id', user.id).maybeSingle()
      if (!tip) return json({ error: 'No matching tip submission found for this transaction.' }, 404, headers)
      if (tip.status === 'confirmed') return json({ confirmed: true, alreadyConfirmed: true }, 200, headers)

      const { data: recipientProfile } = await admin.from('profiles').select('nimiq_address, nimiq_address_verified_at').eq('id', tip.recipient_id).single()
      if (!recipientProfile?.nimiq_address_verified_at || normalizeNimiqAddress(recipientProfile.nimiq_address ?? '') !== reportedRecipient) {
        return json({ error: 'This transaction was not sent to the response author.' }, 409, headers)
      }
      if (body.valueLuna! < tip.amount_luna) return json({ error: 'The confirmed amount is less than what was recorded.' }, 409, headers)

      const { error } = await admin.from('response_tips').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', tip.id)
      if (error) throw error
      const { data: response } = await admin.from('responses').select('ralli_id').eq('id', tip.response_id).single()
      await admin.from('activity_events').insert({ user_id: user.id, ralli_id: response?.ralli_id ?? null, response_id: tip.response_id, kind: 'payment_confirmed', payload: { payment_kind: 'tip', amount_luna: tip.amount_luna, transaction_hash: hash } })
    } else {
      const { data: contribution } = await admin.from('pool_contributions').select('id, status, amount_luna, kind, ralli_id')
        .eq('transaction_hash', hash).eq('contributor_id', user.id).eq('kind', body.kind).maybeSingle()
      if (!contribution) return json({ error: 'No matching contribution submission found for this transaction.' }, 404, headers)
      if (contribution.status === 'confirmed') return json({ confirmed: true, alreadyConfirmed: true }, 200, headers)
      const { data: ralli } = await admin.from('rallis').select('creator_id').eq('id', contribution.ralli_id).single()
      const { data: creator } = await admin.from('profiles').select('nimiq_address, nimiq_address_verified_at').eq('id', ralli?.creator_id ?? '').single()
      if (!creator?.nimiq_address_verified_at || normalizeNimiqAddress(creator.nimiq_address ?? '') !== reportedRecipient) {
        return json({ error: 'This boost was not sent to the Ralli creator.' }, 409, headers)
      }
      if (body.valueLuna! < contribution.amount_luna) return json({ error: 'The confirmed amount is less than what was recorded.' }, 409, headers)

      const { error } = await admin.from('pool_contributions').update({ status: 'confirmed', confirmed_at: new Date().toISOString() }).eq('id', contribution.id)
      if (error) throw error
      await admin.from('activity_events').insert({ user_id: user.id, ralli_id: contribution.ralli_id, kind: 'payment_confirmed', payload: { payment_kind: contribution.kind, amount_luna: contribution.amount_luna, transaction_hash: hash } })
    }

    return json({ confirmed: true }, 200, headers)
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') return json({ error: 'Authentication is required.' }, 401, headers)
    console.error('confirm-payment failed', error)
    return json({ error: 'This payment could not be confirmed. It will stay pending — try again in a moment.' }, 500, headers)
  }
})
