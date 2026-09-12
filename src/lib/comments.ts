import { publicAvatarUrl } from './media.ts'
import { requireSupabase } from './supabase.ts'

export interface RalliComment {
  id: string
  authorId: string
  author: string
  initials: string
  avatarUrl: string | null
  body: string
  createdAt: string
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

export async function fetchComments(ralliId: string, responseId?: string) {
  const database = requireSupabase()
  let query = database.from('comments').select('*').eq('ralli_id', ralliId).order('created_at', { ascending: true }).limit(100)
  query = responseId ? query.eq('response_id', responseId) : query.is('response_id', null)
  const { data, error } = await query
  if (error) throw error
  const authorIds = [...new Set((data ?? []).map((comment) => comment.author_id))]
  const { data: profiles, error: profileError } = authorIds.length
    ? await database.from('profiles').select('id, display_name, handle, avatar_path').in('id', authorIds)
    : { data: [], error: null }
  if (profileError) throw profileError
  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]))
  return (data ?? []).map((comment): RalliComment => {
    const profile = profileById.get(comment.author_id)
    const author = profile?.display_name || profile?.handle || 'Ralli member'
    return { id: comment.id, authorId: comment.author_id, author, initials: initials(author), avatarUrl: publicAvatarUrl(profile?.avatar_path ?? null), body: comment.body, createdAt: comment.created_at }
  })
}

export async function createComment(input: { ralliId: string; responseId?: string; authorId: string; body: string }) {
  const { data, error } = await requireSupabase().from('comments').insert({
    ralli_id: input.ralliId,
    response_id: input.responseId ?? null,
    author_id: input.authorId,
    body: input.body.trim(),
  }).select('id, created_at').single()
  if (error) throw error
  return data
}
