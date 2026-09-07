import { requireSupabase } from './supabase.ts'
import { createId, uploadRalliMedia } from './media.ts'
import { friendlyNetworkError, withNetworkRetry } from './retry.ts'
import { verifyConnectedNimiqAddress } from '../nimiq/signatures.ts'

export interface CreateRalliInput {
  userId: string
  prompt: string
  visibility: 'public' | 'friends'
  durationHours: number
  cover?: File | null
  onStage?: (stage: 'wallet' | 'cover' | 'publish') => void
}

export async function createRalli(input: CreateRalliInput) {
  const id = createId()
  let coverPath: string | null = null
  if (input.cover) {
    input.onStage?.('cover')
    try {
      coverPath = await uploadRalliMedia(input.userId, 'covers', input.cover)
    } catch (error) {
      throw new Error(friendlyNetworkError(error, 'uploading the cover'), { cause: error })
    }
  }
  input.onStage?.('publish')
  const endsAt = new Date(Date.now() + input.durationHours * 60 * 60 * 1000).toISOString()
  const { data, error } = await withNetworkRetry(() => requireSupabase().from('rallis').upsert({
    id,
    creator_id: input.userId,
    prompt: input.prompt.trim(),
    description: '',
    category: input.visibility === 'friends' ? 'Invite only' : 'Just for fun',
    cover_path: coverPath,
    ends_at: endsAt,
  }).select('id').single())
  if (error) throw new Error(friendlyNetworkError(error, 'publishing the Ralli'), { cause: error })
  return data.id
}

export interface CreateResponseInput {
  userId: string
  ralliId: string
  format: 'photo' | 'video' | 'text'
  text: string
  media?: File | null
}

export async function createResponse(input: CreateResponseInput) {
  let mediaPath: string | null = null
  if (input.media) mediaPath = await uploadRalliMedia(input.userId, 'responses', input.media)
  const { data, error } = await requireSupabase().from('responses').insert({
    ralli_id: input.ralliId,
    author_id: input.userId,
    format: input.format,
    text_content: input.text.trim() || null,
    media_path: mediaPath,
  }).select('id').single()
  if (error) throw error
  return data.id
}

export async function ensureVerifiedProfile(userId: string, account: string | null) {
  if (!account) throw new Error('Connect your Nimiq wallet first.')
  const { data, error } = await withNetworkRetry(() => requireSupabase().from('profiles')
    .select('nimiq_address, nimiq_address_verified_at').eq('id', userId).single())
  if (error) throw new Error(friendlyNetworkError(error, 'checking your verified wallet'), { cause: error })
  const connected = account.replace(/\s/g, '').toUpperCase()
  if (!data.nimiq_address_verified_at || data.nimiq_address !== connected) {
    throw new Error('Verify this Nimiq address from the wallet panel before posting.')
  }
}

// Used by Create/Join instead of calling ensureVerifiedProfile directly: if the wallet
// just isn't verified yet, sign the verification challenge right here instead of making
// the user leave to a separate wallet panel and come back. Network/other errors, and a
// wallet that isn't connected at all, still surface as-is — only the "not verified yet"
// gate gets a retry.
export async function ensureWalletAttached(userId: string, account: string | null) {
  try {
    await ensureVerifiedProfile(userId, account)
  } catch (gateError) {
    const message = gateError instanceof Error ? gateError.message : ''
    if (!account || !/verify this nimiq address/i.test(message)) throw gateError
    await verifyConnectedNimiqAddress(account)
    await ensureVerifiedProfile(userId, account)
  }
}
