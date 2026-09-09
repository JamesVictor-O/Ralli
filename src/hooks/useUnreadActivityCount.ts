import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { requireSupabase } from '../lib/supabase.ts'

export function useUnreadActivityCount(user: User | null) {
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!user) {
      setCount(0)
      return
    }
    const { count: value, error } = await requireSupabase()
      .from('activity_events')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .is('read_at', null)
    if (!error) setCount(value ?? 0)
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  useEffect(() => {
    if (!user) return
    const database = requireSupabase()
    const channel = database.channel(`unread-activity-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_events', filter: `user_id=eq.${user.id}` }, () => { void refresh() })
      .subscribe()
    return () => { void database.removeChannel(channel) }
  }, [user, refresh])

  return { count, refresh }
}
