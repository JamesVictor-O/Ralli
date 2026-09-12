import { type KeyboardEvent, type MouseEvent, useEffect } from 'react'
import { ChevronRight, UsersRound } from 'lucide-react'
import { useTodaysRalli } from '../../hooks/useTodaysRalli.ts'
import type { Dare } from './DareCard.tsx'

interface TodaysRalliProps {
  onJoin: (ralli: Dare) => void
  onOpen: (ralli: Dare) => void
  refreshKey?: number
  onLoaded?: (id: string | null) => void
}

export function TodaysRalli({ onJoin, onOpen, refreshKey = 0, onLoaded }: TodaysRalliProps) {
  const { ralli, responded, isCreator, presence, status } = useTodaysRalli(refreshKey)

  useEffect(() => {
    if (status === 'ready' || status === 'empty') onLoaded?.(ralli?.id ?? null)
  }, [status, ralli, onLoaded])

  if (status === 'loading') return <div className="daily-ralli daily-ralli--loading" aria-busy="true" aria-label="Loading today’s Ralli" />
  if (status !== 'ready' || !ralli) return null

  const canViewResponses = responded || isCreator
  function openFromCard(event: MouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element) || !event.target.closest('button, a')) onOpen(ralli!)
  }
  function openFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    onOpen(ralli!)
  }

  return (
    <article className="daily-ralli" role="link" tabIndex={0} aria-label={`Open Ralli: ${ralli.prompt}`} onClick={openFromCard} onKeyDown={openFromKeyboard}>
      <span className="daily-ralli__glow" aria-hidden="true" />
      <div className="daily-ralli__content">
        <div>
          <p className="eyebrow daily-ralli__kicker">Today’s Ralli</p>
          <h2>{ralli.prompt}</h2>
        </div>
        <div>
          {canViewResponses ? (
            <div className="daily-ralli__footer">
              <span><UsersRound aria-hidden="true" /><strong>{isCreator ? 'You started this' : 'You’re in'}</strong><i aria-hidden="true">·</i>{ralli.participants.toLocaleString()} {ralli.participants === 1 ? 'response' : 'responses'}</span>
              <button className="button button--ink" type="button" onClick={() => onOpen(ralli)}>
                See responses <ChevronRight aria-hidden="true" />
              </button>
            </div>
          ) : (
            <>
              {presence && presence.cities.length > 0 && (
                <div className="daily-ralli__pills">
                  {presence.cities.map((city) => <span className="pill pill--dark" key={city.city}>{city.flag} {city.city}</span>)}
                  {presence.moreCount > 0 && <span className="pill pill--funded" title={`${presence.moreCount} more cities`}>+{presence.moreCount}</span>}
                </div>
              )}
              <div className="daily-ralli__footer">
                <span><UsersRound aria-hidden="true" /><strong>{ralli.participants.toLocaleString()}</strong> {ralli.participants === 1 ? 'person has' : 'people have'} joined today</span>
                <button className="button button--ink" type="button" onClick={() => onJoin(ralli)}>
                  Join today’s Ralli <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="daily-ralli__art" aria-hidden="true">
        <img src={ralli.image} alt="" width="400" height="310" fetchPriority="high" decoding="async" />
      </div>
    </article>
  )
}
