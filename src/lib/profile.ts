import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import type { Database } from '../types/database.ts'
import { publicMediaUrl } from './media.ts'
import { requireSupabase } from './supabase.ts'

type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function fetchMyProfile(userId: string) {
  const database = requireSupabase()
  const [profileResult, rallisResult, responsesResult, passesResult, tipsResult] = await Promise.all([
    database.from('profiles').select('*').eq('id', userId).single(),
    database.from('rallis').select('*').eq('creator_id', userId).order('created_at', { ascending: false }),
    database.from('responses').select('*').eq('author_id', userId).order('created_at', { ascending: false }),
    database.from('ralli_passes').select('*').eq('passed_by', userId),
    database.from('response_tips').select('*').eq('recipient_id', userId).eq('status', 'confirmed'),
  ])
  if (profileResult.error) throw profileResult.error
  if (rallisResult.error) throw rallisResult.error
  if (responsesResult.error) throw responsesResult.error
  if (passesResult.error) throw passesResult.error
  if (tipsResult.error) throw tipsResult.error
  const responseIds = (responsesResult.data ?? []).map((response) => response.id)
  const reactionsResult = responseIds.length
    ? await database.from('reactions').select('id').in('response_id', responseIds)
    : { data: [], error: null }
  if (reactionsResult.error) throw reactionsResult.error

  return {
    profile: profileResult.data,
    rallis: rallisResult.data ?? [],
    responses: (responsesResult.data ?? []).map((response) => ({ ...response, mediaUrl: publicMediaUrl(response.media_path) })),
    reactionCount: reactionsResult.data?.length ?? 0,
    passCount: passesResult.data?.length ?? 0,
    nimEarned: (tipsResult.data ?? []).reduce((sum, tip) => sum + Number(tip.amount_luna), 0) / LUNA_PER_NIM,
  }
}

export interface ProfileIdentityFields {
  displayName?: string
  bio?: string
  handle?: string | null
  avatarPath?: string | null
  markOnboarded?: boolean
}

export async function updateMyProfile(userId: string, fields: ProfileIdentityFields) {
  const payload: ProfileUpdate = {}
  if (fields.displayName !== undefined) payload.display_name = fields.displayName.trim()
  if (fields.bio !== undefined) payload.bio = fields.bio.trim()
  if (fields.handle !== undefined) payload.handle = fields.handle ? fields.handle.trim().toLowerCase() : null
  if (fields.avatarPath !== undefined) payload.avatar_path = fields.avatarPath
  if (fields.markOnboarded) payload.onboarded_at = new Date().toISOString()

  const { error } = await requireSupabase().from('profiles').update(payload).eq('id', userId)
  if (error) {
    if (error.code === '23505') throw new Error('That username is already taken.')
    throw error
  }
}

export async function fetchProfileSummary(userId: string) {
  const { data, error } = await requireSupabase()
    .from('profiles')
    .select('display_name, handle, avatar_path, onboarded_at')
    .eq('id', userId)
    .single()
  if (error) throw error
  return data
}

export async function fetchMyChains(userId: string) {
  const database = requireSupabase()
  const { data: passes, error } = await database.from('ralli_passes').select('*').eq('passed_by', userId).order('created_at', { ascending: false })
  if (error) throw error
  const ralliIds = [...new Set((passes ?? []).map((pass) => pass.ralli_id))]
  if (!ralliIds.length) return []
  const { data: rallis, error: ralliError } = await database.from('rallis').select('*').in('id', ralliIds)
  if (ralliError) throw ralliError
  return ralliIds.map((id) => {
    const ralli = rallis?.find((item) => item.id === id)
    const chainPasses = passes?.filter((pass) => pass.ralli_id === id) ?? []
    return { id, prompt: ralli?.prompt ?? 'Ralli', passes: chainPasses.length, lastPassedAt: chainPasses[0]?.created_at ?? '' }
  })
}
