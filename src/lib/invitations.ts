import { requireSupabase } from './supabase.ts'
import { fetchRalliById } from './rallis.ts'

export interface InvitationPreview { ralli_id: string; prompt: string; sender_name: string; status: 'shared' | 'opened' | 'accepted' | 'responded' }

export async function openInvitation(token: string) {
  const { data, error } = await requireSupabase().rpc('open_ralli_invitation', { invite_token: token })
  if (error) throw error
  return data?.[0] as InvitationPreview | undefined
}

export async function acceptInvitation(token: string) {
  const { data, error } = await requireSupabase().rpc('accept_ralli_invitation', { invite_token: token })
  if (error) throw error
  return data
}

export async function fetchInvitationConversion(userId: string) {
  const { data, error } = await requireSupabase().from('ralli_invitations').select('status').eq('sender_id', userId)
  if (error) throw error
  const total = data?.length ?? 0
  const opened = (data ?? []).filter((item) => item.status !== 'shared').length
  const responded = (data ?? []).filter((item) => item.status === 'responded').length
  return { total, opened, responded, rate: total ? Math.round((responded / total) * 100) : 0 }
}

export async function fetchPendingChallenge(userId: string) {
  const database = requireSupabase()
  const { data: invitation, error } = await database.from('ralli_invitations')
    .select('*')
    .eq('recipient_id', userId)
    .eq('status', 'accepted')
    .order('accepted_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) throw error
  if (!invitation) return null

  const [{ data: sender }, ralli] = await Promise.all([
    database.from('profiles').select('display_name').eq('id', invitation.sender_id).maybeSingle(),
    fetchRalliById(invitation.ralli_id),
  ])
  return { invitationId: invitation.id, senderName: sender?.display_name || 'Someone', ralli }
}
