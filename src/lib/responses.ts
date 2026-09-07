import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import { publicAvatarUrl, publicMediaUrl } from './media.ts'
import { requireSupabase } from './supabase.ts'

export interface RalliResponse {
  id: string
  ralliId: string
  authorId: string
  author: string
  authorAddress: string | null
  authorAvatarUrl: string | null
  initials: string
  createdAt: string
  copy: string
  mediaUrl: string | null
  format: 'text' | 'photo' | 'video'
  reactions: number
  selectedReaction: string | null
  tips: number
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

export async function fetchResponses(ralliId: string, viewerId: string | null): Promise<RalliResponse[]> {
  const database = requireSupabase()
  const { data: rows, error } = await database.from('responses').select('*')
    .eq('ralli_id', ralliId).neq('status', 'hidden').order('created_at', { ascending: false })
  if (error) throw error
  if (!rows?.length) return []

  const authorIds = [...new Set(rows.map((row) => row.author_id))]
  const responseIds = rows.map((row) => row.id)
  const [profilesResult, reactionsResult, tipsResult] = await Promise.all([
    database.from('profiles').select('id, display_name, handle, avatar_path, nimiq_address, nimiq_address_verified_at').in('id', authorIds),
    database.from('reactions').select('*').in('response_id', responseIds),
    database.from('response_tips').select('*').in('response_id', responseIds).eq('status', 'confirmed'),
  ])
  if (profilesResult.error) throw profilesResult.error
  if (reactionsResult.error) throw reactionsResult.error
  if (tipsResult.error) throw tipsResult.error

  const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]))
  return rows.map((row) => {
    const profile = profiles.get(row.author_id)
    const name = profile?.display_name || profile?.handle || 'Ralli member'
    const reactions = (reactionsResult.data ?? []).filter((reaction) => reaction.response_id === row.id)
    const tipLuna = (tipsResult.data ?? []).filter((tip) => tip.response_id === row.id)
      .reduce((total, tip) => total + Number(tip.amount_luna), 0)
    return {
      id: row.id,
      ralliId: row.ralli_id,
      authorId: row.author_id,
      author: name,
      authorAddress: profile?.nimiq_address_verified_at ? profile.nimiq_address : null,
      authorAvatarUrl: publicAvatarUrl(profile?.avatar_path ?? null),
      initials: initials(name),
      createdAt: row.created_at,
      copy: row.text_content || '',
      mediaUrl: publicMediaUrl(row.media_path),
      format: row.format,
      reactions: reactions.length,
      selectedReaction: reactions.find((reaction) => reaction.user_id === viewerId)?.kind ?? null,
      tips: tipLuna / LUNA_PER_NIM,
    }
  })
}

export async function hasResponded(ralliId: string, userId: string) {
  const { data, error } = await requireSupabase().from('responses').select('id')
    .eq('ralli_id', ralliId).eq('author_id', userId).maybeSingle()
  if (error) throw error
  return Boolean(data)
}

export async function setReaction(responseId: string, userId: string, previous: string | null, next: string | null) {
  const database = requireSupabase()
  if (previous) {
    const { error } = await database.from('reactions').delete().eq('response_id', responseId).eq('user_id', userId).eq('kind', previous)
    if (error) throw error
  }
  if (next) {
    const { error } = await database.from('reactions').insert({ response_id: responseId, user_id: userId, kind: next })
    if (error) throw error
  }
}

export async function recordPass(ralliId: string, responseId: string | null, userId: string) {
  const { data, error } = await requireSupabase().from('ralli_passes').insert({
    ralli_id: ralliId,
    response_id: responseId,
    passed_by: userId,
  }).select('share_code').single()
  if (error) throw error
  return data.share_code
}
