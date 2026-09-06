import { FunctionsHttpError } from '@supabase/supabase-js'
import { requireSupabase } from '../lib/supabase.ts'
import { getNimiqClient } from './client.ts'
import { bytesToHex, getNimiqHub, isNimiqPayContext } from './hub.ts'
import { isNimiqError } from './types.ts'

type ChallengeResponse = { challengeId: string; message: string; expiresAt: string }
type VerificationResponse = { verified: true; address: string }

async function functionError(error: unknown, fallback: string) {
  if (error instanceof FunctionsHttpError) {
    const body = await error.context.json().catch(() => null) as { error?: string } | null
    if (body?.error) return new Error(body.error)
  }
  return error instanceof Error ? error : new Error(fallback)
}

export async function verifyConnectedNimiqAddress(address: string) {
  const database = requireSupabase()
  const challengeRequest = database.functions.invoke<ChallengeResponse>('wallet-challenge', {
    body: { address },
  })
  const challengePromise = challengeRequest.then(async ({ data, error }) => {
    if (error || !data) throw await functionError(error, 'Could not start wallet verification.')
    return data
  })

  let challenge: ChallengeResponse
  let publicKey: string
  let signature: string
  let signatureMode: 'raw' | 'hub'
  if (isNimiqPayContext()) {
    challenge = await challengePromise
    const client = await getNimiqClient()
    const proof = await client.sign(challenge.message)
    if (isNimiqError(proof)) throw new Error(proof.error.message)
    publicKey = proof.publicKey
    signature = proof.signature
    signatureMode = 'raw'
  } else {
    const signed = await getNimiqHub().signMessage(challengePromise.then(({ message }) => ({ appName: 'Ralli', message, signer: address })))
    challenge = await challengePromise
    publicKey = bytesToHex(signed.signerPublicKey)
    signature = bytesToHex(signed.signature)
    signatureMode = 'hub'
  }

  const { data, error } = await database.functions.invoke<VerificationResponse>('wallet-verify', {
    body: {
      challengeId: challenge.challengeId,
      publicKey,
      signature,
      signatureMode,
    },
  })
  if (error || !data?.verified) throw await functionError(error, 'The wallet signature could not be verified.')
  return data
}
