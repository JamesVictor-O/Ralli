import { useEffect, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Clock3, Globe2, MapPin, UsersRound, X } from 'lucide-react'

const cities = [
  ['Lagos', 'Nigeria', 'AO', 'lime'],
  ['Berlin', 'Germany', 'MK', 'violet'],
  ['Accra', 'Ghana', 'KA', 'coral'],
  ['Lisbon', 'Portugal', 'IN', 'blue'],
]

export function CommunityRalli({ onClose }: { onClose: () => void }) {
  const [joined, setJoined] = useState(false)
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="community-ralli-title">
      <section className="flow-sheet community-ralli-view">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /><span>Discover</span></button>
          <button className="icon-button" type="button" aria-label="Close community Ralli" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        <div className="community-hero">
          <div>
            <span className="pill pill--dark"><Globe2 aria-hidden="true" />Community Ralli</span>
            <p className="eyebrow">{joined ? '74' : '73'} of 100 cities reached</p>
            <h1 id="community-ralli-title">Show us something unique about your city.</h1>
          </div>
          <div className="community-globe" aria-hidden="true"><span>{joined ? '74' : '73'}</span><small>cities</small></div>
          <div className={`community-progress ${joined ? 'is-joined' : ''}`}><span /></div>
        </div>

        <div className="community-body">
          <div className="community-metrics">
            <span><UsersRound aria-hidden="true" /><strong>1,406</strong><small>people joined</small></span>
            <span><MapPin aria-hidden="true" /><strong>{joined ? '74' : '73'}</strong><small>cities reached</small></span>
            <span><Clock3 aria-hidden="true" /><strong>09:42</strong><small>hours left</small></span>
          </div>

          <div className="section-heading">
            <div><p className="eyebrow">Latest arrivals</p><h2>The world is joining in</h2></div>
            <span>Updated now</span>
          </div>
          <div className="city-list">
            {cities.map(([city, country, initials, tone], index) => (
              <button type="button" key={city}>
                <span className={`avatar avatar--author avatar--${tone}`}>{initials}</span>
                <span><strong>{city}</strong><small>{country} · {index * 7 + 3} responses</small></span>
                <ChevronRight aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>

        <footer className="flow-actions">
          <button className="button button--ink button--wide" type="button" disabled={joined} onClick={() => setJoined(true)}>
            {joined ? <><Check aria-hidden="true" />Lagos added</> : <>Add my city <ChevronRight aria-hidden="true" /></>}
          </button>
        </footer>
      </section>
    </div>
  )
}
