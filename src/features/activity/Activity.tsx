import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Bell, Heart, LoaderCircle, MessageCircle, Repeat2, Sparkles, Zap } from 'lucide-react'
import { requireSupabase } from '../../lib/supabase.ts'
import { useBackend } from '../../store/backend.ts'
import type { Database } from '../../types/database.ts'

type Filter = 'All' | 'Social' | 'NIM'
type ActivityRow = Database['public']['Tables']['activity_events']['Row']

const presentation = {
  reaction: { icon: Heart, tone: 'coral', title: 'Someone reacted to your response', kind: 'Social' },
  pass: { icon: Repeat2, tone: 'violet', title: 'Someone passed your Ralli on', kind: 'Social' },
  response: { icon: MessageCircle, tone: 'blue', title: 'Someone joined your Ralli', kind: 'Social' },
  tip: { icon: Zap, tone: 'lime', title: 'You received a NIM tip', kind: 'NIM' },
  boost: { icon: Sparkles, tone: 'violet', title: 'Someone boosted your reward pool', kind: 'NIM' },
} as const

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export function Activity() {
  const [filter, setFilter] = useState<Filter>('All')
  const [events, setEvents] = useState<ActivityRow[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const { user } = useBackend()

  const load = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    const { data, error } = await requireSupabase().from('activity_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (error) return setStatus('error')
    setEvents(data ?? [])
    setStatus(data?.length ? 'success' : 'empty')
  }, [user])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function markAllRead() {
    if (!user) return
    const now = new Date().toISOString()
    const { error } = await requireSupabase().from('activity_events').update({ read_at: now }).eq('user_id', user.id).is('read_at', null)
    if (!error) setEvents((current) => current.map((event) => ({ ...event, read_at: event.read_at ?? now })))
  }

  const visibleEvents = events.filter((event) => {
    const item = presentation[event.kind as keyof typeof presentation]
    return filter === 'All' || item?.kind === filter
  })

  return <section className="page-view" aria-labelledby="activity-title">
    <header className="page-heading"><div><p className="eyebrow">Stay in the loop</p><h1 id="activity-title">Activity</h1></div><button className="text-action" type="button" disabled={!events.some((event) => !event.read_at)} onClick={() => void markAllRead()}>Mark all as read</button></header>
    <div className="page-tabs" role="tablist" aria-label="Activity filters">{(['All', 'Social', 'NIM'] as Filter[]).map((item) => <button className={filter === item ? 'is-active' : ''} type="button" role="tab" aria-selected={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div>
    {status === 'loading' && <div className="empty-state" aria-busy="true"><span className="empty-state__icon"><LoaderCircle className="spin" aria-hidden="true" /></span><h2>Loading activity…</h2></div>}
    {status === 'error' && <div className="empty-state" role="alert"><span className="empty-state__icon"><AlertCircle aria-hidden="true" /></span><h2>Activity didn’t load</h2><button className="button button--ink" type="button" onClick={() => void load()}>Try again</button></div>}
    {(status === 'empty' || (status === 'success' && !visibleEvents.length)) && <div className="empty-state"><span className="empty-state__icon"><Bell aria-hidden="true" /></span><h2>All caught up</h2><p>Your reactions, passes, tips, and boosts will appear here.</p></div>}
    {status === 'success' && visibleEvents.length > 0 && <div className="activity-list"><section className="activity-group" aria-labelledby="activity-recent"><h2 id="activity-recent">Recent</h2><div className="activity-card">{visibleEvents.map((event) => {
      const item = presentation[event.kind as keyof typeof presentation] ?? presentation.response
      const Icon = item.icon
      return <article className="activity-row" key={event.id}><span className={`event-icon event-icon--${item.tone}`}><Icon aria-hidden="true" /></span><span className="activity-row__copy"><strong>{item.title}</strong><small>{relativeTime(event.created_at)} ago</small></span>{!event.read_at && <span className="unread-dot"><span className="sr-only">Unread</span></span>}</article>
    })}</div></section></div>}
  </section>
}
