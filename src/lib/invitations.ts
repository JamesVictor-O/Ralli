import { requireSupabase } from './supabase.ts'

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
