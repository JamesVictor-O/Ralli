import { useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import { useTodaysRalli } from '../../hooks/useTodaysRalli.ts'
import type { Dare } from './DareCard.tsx'

interface TodaysRalliProps {
  onJoin: (ralli: Dare) => void
  onOpen: (ralli: Dare) => void
  refreshKey?: number
  onLoaded?: (id: string | null) => void
}

export function TodaysRalli({ onJoin, onOpen, refreshKey = 0, onLoaded }: TodaysRalliProps) {
  const { ralli, responded, presence, status } = useTodaysRalli(refreshKey)

  useEffect(() => {
    if (status === 'ready' || status === 'empty') onLoaded?.(ralli?.id ?? null)
  }, [status, ralli, onLoaded])

  if (status === 'loading') return <div className="daily-ralli daily-ralli--loading" aria-busy="true" aria-label="Loading today’s Ralli" />
  if (status !== 'ready' || !ralli) return null

  return (
    <article className="daily-ralli">
      <span className="daily-ralli__glow" aria-hidden="true" />
      <div className="daily-ralli__content">
        <div>
          <p className="eyebrow daily-ralli__kicker">Today’s Ralli</p>
          <h2>{ralli.prompt}</h2>
        </div>
        <div>
          {responded ? (
            <div className="daily-ralli__footer">
              <span><strong>You’re in.</strong> {ralli.participants.toLocaleString()} {ralli.participants === 1 ? 'response' : 'responses'} so far.</span>
              <button className="button button--ink" type="button" onClick={() => onOpen(ralli)}>
                See what everyone posted <ChevronRight aria-hidden="true" />
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
                <span><strong>{ralli.participants.toLocaleString()}</strong> {ralli.participants === 1 ? 'person has' : 'people have'} joined today</span>
                <button className="button button--ink" type="button" onClick={() => onJoin(ralli)}>
                  Join today’s Ralli <ChevronRight aria-hidden="true" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="daily-ralli__art" aria-hidden="true">
        <img src={ralli.image} alt="" width="400" height="310" />
      </div>
    </article>
  )
}
