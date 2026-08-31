import { useState } from 'react'
import { Bell, ChevronRight, Heart, MessageCircle, Repeat2, Sparkles, UserPlus, Zap } from 'lucide-react'

type Filter = 'All' | 'Social' | 'NIM'

const events = [
  { id: 1, group: 'Today', kind: 'Social', icon: Heart, tone: 'coral', title: 'Maya loved your response', body: '“The most dramatic cup of coffee”', time: '4m', unread: true },
  { id: 2, group: 'Today', kind: 'Social', icon: Repeat2, tone: 'violet', title: 'Kofi passed your Ralli to Ada', body: 'Your chain just reached 8 people.', time: '18m', unread: true },
  { id: 3, group: 'Today', kind: 'NIM', icon: Zap, tone: 'lime', title: 'You received a 2 NIM tip', body: 'From Jo for your sky response.', time: '1h', unread: true },
  { id: 4, group: 'Earlier', kind: 'Social', icon: UserPlus, tone: 'blue', title: 'Amara invited you to a Ralli', body: 'Recreate your oldest photo today.', time: '3h', unread: false },
  { id: 5, group: 'Earlier', kind: 'NIM', icon: Sparkles, tone: 'violet', title: 'A reward pool reached 24 NIM', body: 'The sky Ralli is picking up momentum.', time: 'Yesterday', unread: false },
  { id: 6, group: 'Earlier', kind: 'Social', icon: MessageCircle, tone: 'coral', title: 'Three new reactions', body: 'People are responding to your desk photo.', time: 'Yesterday', unread: false },
] as const

export function Activity() {
  const [filter, setFilter] = useState<Filter>('All')
  const [readAll, setReadAll] = useState(false)
  const visibleEvents = events.filter((event) => filter === 'All' || event.kind === filter)

  return (
    <section className="page-view" aria-labelledby="activity-title">
      <header className="page-heading">
        <div><p className="eyebrow">Stay in the loop</p><h1 id="activity-title">Activity</h1></div>
        <button className="text-action" type="button" onClick={() => setReadAll(true)}>Mark all as read</button>
      </header>

      <div className="page-tabs" role="tablist" aria-label="Activity filters">
        {(['All', 'Social', 'NIM'] as Filter[]).map((item) => (
          <button className={filter === item ? 'is-active' : ''} type="button" role="tab"
            aria-selected={filter === item} key={item} onClick={() => setFilter(item)}>{item}</button>
        ))}
      </div>

      {visibleEvents.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon"><Bell aria-hidden="true" /></span>
          <h2>All caught up</h2>
          <p>Join a Ralli and the good stuff will show up here.</p>
          <button className="button button--ink" type="button">Find a Ralli</button>
        </div>
      ) : (
        <div className="activity-list">
          {['Today', 'Earlier'].map((group) => {
            const groupedEvents = visibleEvents.filter((event) => event.group === group)
            if (!groupedEvents.length) return null
            return (
              <section className="activity-group" aria-labelledby={`activity-${group.toLowerCase()}`} key={group}>
                <h2 id={`activity-${group.toLowerCase()}`}>{group}</h2>
                <div className="activity-card">
                  {groupedEvents.map((event) => {
                    const Icon = event.icon
                    return (
                      <button className="activity-row" type="button" key={event.id}>
                        <span className={`event-icon event-icon--${event.tone}`}><Icon aria-hidden="true" /></span>
                        <span className="activity-row__copy">
                          <strong>{event.title}</strong><small>{event.body}</small>
                        </span>
                        <span className="activity-row__time">{event.time}</span>
                        {event.unread && !readAll && <span className="unread-dot"><span className="sr-only">Unread</span></span>}
                        <ChevronRight aria-hidden="true" />
                      </button>
                    )
                  })}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </section>
  )
}
