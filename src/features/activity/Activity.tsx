import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Bell, ChevronRight, Heart, LoaderCircle, MessageCircle, Repeat2, Sparkles, Zap } from 'lucide-react'
import { requireSupabase } from '../../lib/supabase.ts'
import { fetchRalliById } from '../../lib/rallis.ts'
import type { Dare } from '../discover/DareCard.tsx'
import { useBackend } from '../../store/backend.ts'
import type { Database } from '../../types/database.ts'

type Filter = 'All' | 'Social' | 'NIM'
type ActivityRow = Database['public']['Tables']['activity_events']['Row']

const presentation = {
  reaction: { icon: Heart, tone: 'coral', title: (actor: string) => `${actor} reacted to your response`, kind: 'Social' },
  pass: { icon: Repeat2, tone: 'violet', title: (actor: string) => `${actor} passed your Ralli on`, kind: 'Social' },
  response: { icon: MessageCircle, tone: 'blue', title: (actor: string) => `${actor} joined your Ralli`, kind: 'Social' },
  tip: { icon: Zap, tone: 'lime', title: (actor: string) => `${actor} sent you a NIM tip`, kind: 'NIM' },
  boost: { icon: Sparkles, tone: 'violet', title: (actor: string) => `${actor} sent you a Ralli boost`, kind: 'NIM' },
  invitation: { icon: Repeat2, tone: 'violet', title: (actor: string) => `${actor} challenged you to a Ralli`, kind: 'Social' },
  invitation_response: { icon: Zap, tone: 'lime', title: (actor: string) => `${actor} responded through your invitation`, kind: 'Social' },
  payment_confirmed: { icon: Sparkles, tone: 'lime', title: () => 'Your NIM payment was confirmed', kind: 'NIM' },
} as const

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export function Activity({ onOpenRalli, onRead }: { onOpenRalli: (ralli: Dare) => void; onRead?: () => void }) {
  const [filter, setFilter] = useState<Filter>('All')
  const [events, setEvents] = useState<ActivityRow[]>([])
  const [actorNames, setActorNames] = useState<Record<string, string>>({})
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const { user } = useBackend()

  const load = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    const database = requireSupabase()
    const { data, error } = await database.from('activity_events').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)
    if (error) return setStatus('error')
    setEvents(data ?? [])
    setStatus(data?.length ? 'success' : 'empty')

    const actorIds = [...new Set((data ?? []).map((event) => event.actor_id).filter((id): id is string => Boolean(id)))]
    if (actorIds.length) {
      const { data: actors } = await database.from('profiles').select('id, display_name').in('id', actorIds)
      if (actors) setActorNames(Object.fromEntries(actors.map((actor) => [actor.id, actor.display_name])))
    }
  }, [user])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    if (!user) return
    const database = requireSupabase()
    const channel = database.channel(`activity-page-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_events', filter: `user_id=eq.${user.id}` }, () => { void load(); onRead?.() })
      .subscribe()
    return () => { void database.removeChannel(channel) }
  }, [user, load, onRead])

  async function markAllRead() {
    if (!user) return
    const now = new Date().toISOString()
    const { error } = await requireSupabase().from('activity_events').update({ read_at: now }).eq('user_id', user.id).is('read_at', null)
    if (!error) {
      setEvents((current) => current.map((event) => ({ ...event, read_at: event.read_at ?? now })))
      onRead?.()
    }
  }

  async function openEvent(event: ActivityRow) {
    if (!event.ralli_id || openingId) return
    setOpeningId(event.id)
    try {
      if (!event.read_at) {
        const now = new Date().toISOString()
        const { error } = await requireSupabase().from('activity_events').update({ read_at: now }).eq('id', event.id)
        if (!error) {
          setEvents((current) => current.map((item) => item.id === event.id ? { ...item, read_at: now } : item))
          onRead?.()
        }
      }
      const ralli = await fetchRalliById(event.ralli_id)
      onOpenRalli(ralli)
    } catch {
      // The Ralli may have been removed since the event was recorded — nothing to open.
    } finally {
      setOpeningId(null)
    }
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
      const actor = (event.actor_id && actorNames[event.actor_id]) || 'Someone'
      const openable = Boolean(event.ralli_id)
      return (
        <button className="activity-row" type="button" key={event.id} disabled={!openable || openingId === event.id}
          aria-busy={openingId === event.id} onClick={() => void openEvent(event)}>
          <span className={`event-icon event-icon--${item.tone}`}><Icon aria-hidden="true" /></span>
          <span className="activity-row__copy"><strong>{item.title(actor)}</strong></span>
          <span className="activity-row__time">{relativeTime(event.created_at)} ago</span>
          {!event.read_at && <span className="unread-dot"><span className="sr-only">Unread</span></span>}
          {openingId === event.id ? <LoaderCircle className="spin" aria-hidden="true" /> : openable && <ChevronRight aria-hidden="true" />}
        </button>
      )
    })}</div></section></div>}
  </section>
}
