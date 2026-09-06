import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import { publicMediaUrl } from './media.ts'
import { requireSupabase } from './supabase.ts'

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

export async function updateMyProfile(userId: string, displayName: string, bio: string) {
  const { error } = await requireSupabase().from('profiles').update({ display_name: displayName.trim(), bio: bio.trim() }).eq('id', userId)
  if (error) throw error
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
