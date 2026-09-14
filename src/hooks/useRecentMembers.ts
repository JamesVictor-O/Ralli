import { useCallback, useEffect, useState } from 'react'
import { publicAvatarUrl } from '../lib/media.ts'
import { requireSupabase } from '../lib/supabase.ts'

export interface RecentMember {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

export function useRecentMembers() {
  const [members, setMembers] = useState<RecentMember[]>([])
  const [total, setTotal] = useState(0)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const refresh = useCallback(async () => {
    try {
      const { data, count, error } = await requireSupabase().from('profiles')
        .select('id, display_name, avatar_path', { count: 'exact' })
        .not('onboarded_at', 'is', null)
        .order('onboarded_at', { ascending: false })
        .limit(5)
      if (error) throw error
      setMembers((data ?? []).map((profile) => ({
        id: profile.id,
        name: profile.display_name || 'Ralli member',
        initials: initials(profile.display_name || 'Ralli member'),
        avatarUrl: publicAvatarUrl(profile.avatar_path),
      })))
      setTotal(count ?? 0)
      setStatus('ready')
    } catch {
      setStatus('error')
    }
  }, [])

  useEffect(() => { void Promise.resolve().then(refresh) }, [refresh])
  useEffect(() => {
    const database = requireSupabase()
    // Each effect instance needs its own topic. React Strict Mode can start the
    // replacement before Supabase has finished removing the previous channel.
    const channel = database.channel(`recent-ralli-members-${Date.now()}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => void refresh())
      .subscribe()
    return () => { void database.removeChannel(channel) }
  }, [refresh])

  return { members, total, status, refresh }
}
