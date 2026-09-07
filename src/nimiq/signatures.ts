import { FunctionsHttpError } from '@supabase/supabase-js'
import HubApi from '@nimiq/hub-api'
import { requireSupabase } from '../lib/supabase.ts'
import { getNimiqClient } from './client.ts'
import { bytesToHex, getNimiqHub, isMobileHubClient, isNimiqPayContext } from './hub.ts'
import { isNimiqError } from './types.ts'

type ChallengeResponse = { challengeId: string; message: string; expiresAt: string }
type VerificationResponse =
  | { verified: true; address: string }
  | { relogin: true; address: string; email: string; tokenHash: string }

async function functionError(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as { error?: string } | null
    if (body?.error) return new Error(body.error)
  }
  return error instanceof Error ? error : new Error(fallback)
}

async function requestChallenge(address: string) {
  const { data, error } = await requireSupabase().functions.invoke<ChallengeResponse>('wallet-challenge', {
    body: { address },
  })
  if (error || !data) throw await functionError(error, 'Could not start wallet verification.')
  return data
}

export interface SignatureProof {
  challengeId: string
  publicKey: string
  signature: string
  signatureMode: 'raw' | 'hub'
}

// Finishes verification once a signature has been produced — shared by the direct
// (popup/Nimiq Pay) path and the mobile redirect-return handler in AppProviders.
export async function completeVerification(proof: SignatureProof) {
  const database = requireSupabase()
  const { data, error } = await database.functions.invoke<VerificationResponse>('wallet-verify', { body: proof })
  if (error || !data) throw await functionError(error, 'The wallet signature could not be verified.')

  if ('relogin' in data && data.relogin) {
    // This address is already verified on another profile (e.g. a different device).
    // Redeem the one-time token to switch this browser into that existing account.
    const { error: otpError } = await database.auth.verifyOtp({
      token_hash: data.tokenHash,
      type: 'email',
    })
    if (otpError) throw new Error('This wallet is already registered, but Ralli could not switch you into that account. Please try again.')
    return { verified: true as const, address: data.address }
  }

  return data
}

export async function verifyConnectedNimiqAddress(address: string) {
  const challengePromise = requestChallenge(address)

  if (isNimiqPayContext()) {
    const challenge = await challengePromise
    const client = await getNimiqClient()
    const proof = await client.sign(challenge.message)
    if (isNimiqError(proof)) throw new Error(proof.error.message)
    return completeVerification({ challengeId: challenge.challengeId, publicKey: proof.publicKey, signature: proof.signature, signatureMode: 'raw' })
  }

  if (isMobileHubClient()) {
    // Popup-based signing breaks on mobile the same way wallet connect does (see
    // isMobileHubClient). Redirect instead — the signature comes back to the
    // SIGN_MESSAGE handler registered in AppProviders, which finishes verification.
    const challenge = await challengePromise
    await getNimiqHub().signMessage<typeof HubApi.BehaviorType.REDIRECT>(
      { appName: 'Ralli', message: challenge.message, signer: address },
      new HubApi.RedirectRequestBehavior(window.location.href, { challengeId: challenge.challengeId }),
    )
    return { verified: false as const, pending: true as const }
  }

  const signed = await getNimiqHub().signMessage(challengePromise.then(({ message }) => ({ appName: 'Ralli', message, signer: address })))
  const challenge = await challengePromise
  return completeVerification({
    challengeId: challenge.challengeId,
    publicKey: bytesToHex(signed.signerPublicKey),
    signature: bytesToHex(signed.signature),
    signatureMode: 'hub',
  })
}
