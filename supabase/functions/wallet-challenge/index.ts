import { corsHeaders, json } from '../_shared/http.ts'
import { requireUser } from '../_shared/auth.ts'
import { formatNimiqAddress, isValidNimiqAddress, normalizeNimiqAddress } from '../_shared/nimiq.ts'

const CHALLENGE_LIFETIME_MS = 5 * 60 * 1000

function randomNonce() {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request)
  if (!headers) return json({ error: 'Origin is not allowed.' }, 403, {})
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405, headers)

  try {
    const { user, admin } = await requireUser(request)
    const body = await request.json().catch(() => null) as { address?: unknown } | null
    if (!body || typeof body.address !== 'string' || !isValidNimiqAddress(body.address)) {
      return json({ error: 'Enter a valid Nimiq address.' }, 400, headers)
    }

    const address = normalizeNimiqAddress(body.address)
    const nonce = randomNonce()
    const issuedAt = new Date()
    const expiresAt = new Date(issuedAt.getTime() + CHALLENGE_LIFETIME_MS)
    const message = [
      'Verify your Nimiq address for Ralli',
      '',
      `Address: ${formatNimiqAddress(address)}`,
      `Ralli user: ${user.id}`,
      `Nonce: ${nonce}`,
      `Issued at: ${issuedAt.toISOString()}`,
      '',
      'This request does not send NIM or authorize payments.',
    ].join('\n')

    await admin.from('wallet_verification_challenges')
      .delete()
      .eq('user_id', user.id)
      .is('used_at', null)

    const { data, error } = await admin.from('wallet_verification_challenges').insert({
      user_id: user.id,
      nimiq_address: address,
      nonce_hash: await sha256(nonce),
      message,
      expires_at: expiresAt.toISOString(),
    }).select('id, expires_at').single()
    if (error) throw error

    return json({ challengeId: data.id, message, expiresAt: data.expires_at }, 200, headers)
  } catch (error) {
    if (error instanceof Error && error.message === 'AUTH_REQUIRED') {
      return json({ error: 'Authentication is required.' }, 401, headers)
    }
    console.error('wallet-challenge failed', error)
    return json({ error: 'Could not create a wallet verification request.' }, 500, headers)
  }
})
