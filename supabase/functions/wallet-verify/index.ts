import { corsHeaders, json } from '../_shared/http.ts'
import { requireUser } from '../_shared/auth.ts'
import { normalizeNimiqAddress, verifyNimiqProof } from '../_shared/nimiq.ts'

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return json({ error: 'Origin is not allowed.' }, 403, {})
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers)

  try {
    const { user, admin } = await requireUser(request)
    const body = await request.json().catch(() => null) as {
      challengeId?: unknown
      publicKey?: unknown
      signature?: unknown
      signatureMode?: unknown
    } | null
    if (!body || typeof body.challengeId !== 'string' || typeof body.publicKey !== 'string' || typeof body.signature !== 'string'
      || (body.signatureMode !== 'raw' && body.signatureMode !== 'hub')) {
      return json({ error: 'The verification proof is incomplete.' }, 400, headers)
    }

    const { data: challenge, error: challengeError } = await admin
      .from('wallet_verification_challenges')
      .select('id, nimiq_address, message, expires_at, used_at')
      .eq('id', body.challengeId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (challengeError) throw challengeError
    if (!challenge || challenge.used_at || new Date(challenge.expires_at).getTime() <= Date.now()) {
      return json({ error: 'This verification request expired. Please try again.' }, 410, headers)
    }

    let valid = false
    try {
      valid = verifyNimiqProof(challenge.message, challenge.nimiq_address, body.publicKey, body.signature, body.signatureMode)
    } catch {
      valid = false
    }
    if (!valid) return json({ error: 'The signature does not match this Nimiq address.' }, 400, headers)

    const address = normalizeNimiqAddress(challenge.nimiq_address)
    const { error: completionError } = await admin.rpc('complete_wallet_verification', {
      challenge_id: challenge.id,
      profile_id: user.id,
      verified_address: address,
    })
    if (completionError) {
      if (completionError.code === '23505') {
        return json({ error: 'This Nimiq address is already linked to another Ralli profile.' }, 409, headers)
      }
      throw completionError
    }

    return json({ verified: true, address }, 200, headers)
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return json({ error: 'Authentication is required.' }, 401, headers)
    }
    console.error('wallet-verify failed', error)
    return json({ error: 'Could not verify this Nimiq address.' }, 500, headers)
  }
})
