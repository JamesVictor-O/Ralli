import { useRef, useState } from 'react'
import { ArrowUpRight, Check, ChevronRight, Globe2, Link2, MapPin, Sparkles, UsersRound, X, Zap } from 'lucide-react'

const chains = [
  { title: 'Weirdest thing on your desk', people: 8, reach: '4 cities', status: 'Moving now', tone: 'lime', initials: ['AO', 'NK', 'SA', 'JD'] },
  { title: 'Sky where you are', people: 23, reach: '12 cities', status: '2h ago', tone: 'violet', initials: ['MO', 'LI', 'KA', 'EN'] },
  { title: 'Breakfast where you live', people: 14, reach: '9 cities', status: 'Yesterday', tone: 'coral', initials: ['FA', 'AN', 'TO', 'MI'] },
]

export function RalliChain() {
  const [isExploring, setIsExploring] = useState(false)
  const journeyRef = useRef<HTMLDivElement>(null)

  function toggleJourney() {
    setIsExploring((value) => {
      const next = !value
      if (next) window.setTimeout(() => journeyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 0)
      return next
    })
  }

  return (
    <section className="page-view" aria-labelledby="chains-title">
      <header className="page-heading">
        <div><p className="eyebrow">See where it travelled</p><h1 id="chains-title">Ralli Chains</h1></div>
        <button className="icon-button page-icon-button" type="button" aria-label="Share your chains"><ArrowUpRight aria-hidden="true" /></button>
      </header>

      <article className="chain-spotlight">
        <div className="chain-spotlight__copy">
          <span className="pill pill--dark"><Sparkles aria-hidden="true" />Longest chain</span>
          <div><p className="eyebrow">Started by you</p><h2>Show us something your city is known for.</h2></div>
          <div className="chain-summary">
            <span><UsersRound aria-hidden="true" /><strong>42</strong> people</span>
            <span><Globe2 aria-hidden="true" /><strong>18</strong> cities</span>
          </div>
        </div>
        <div className="chain-map" aria-label="Chain travelled through five people">
          {['AO', 'MA', 'KO', 'LE', '+38'].map((person, index) => (
            <span className={`chain-node chain-node--${index + 1}`} key={person}>{person}</span>
          ))}
          <svg viewBox="0 0 400 180" role="presentation" aria-hidden="true">
            <path d="M40 90 C90 10 130 170 190 88 S300 12 360 92" />
          </svg>
        </div>
        <button className="button button--ink" type="button" aria-expanded={isExploring} aria-controls="chain-journey" onClick={toggleJourney}>
          {isExploring ? 'Close the chain' : 'Explore the chain'}
          {isExploring ? <X aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
      </article>

      {isExploring && (
        <div className="chain-journey" id="chain-journey" ref={journeyRef}>
          <header>
            <div><p className="eyebrow">42 people · 18 cities</p><h2>From Lagos to the world</h2></div>
            <span className="live-pill"><span />Moving now</span>
          </header>
          <div className="journey-route">
            {[
              ['Alex', 'Lagos, Nigeria', 'Started it', 'AO', 'lime'],
              ['Maya', 'Accra, Ghana', 'Joined 14m later', 'MA', 'coral'],
              ['Kofi', 'Lisbon, Portugal', 'Passed it on', 'KO', 'blue'],
              ['Lea', 'Berlin, Germany', 'Joined 1h later', 'LE', 'violet'],
              ['38 more people', '14 more cities', 'The chain continues', '+38', 'ink'],
            ].map(([name, place, action, initials, tone], index) => (
              <article className="journey-stop" key={name}>
                <div className="journey-marker">
                  <span className={`avatar avatar--journey avatar--${tone}`}>{initials}</span>
                  {index < 4 && <i aria-hidden="true" />}
                </div>
                <div><strong>{name}</strong><span><MapPin aria-hidden="true" />{place}</span><small>{action}</small></div>
                <span className="journey-check"><Check aria-hidden="true" /></span>
              </article>
            ))}
          </div>
        </div>
      )}

      <div className="section-heading">
        <div><p className="eyebrow">Your journeys</p><h2>Chains you touched</h2></div>
        <span>3 active</span>
      </div>

      <div className="chain-list">
        {chains.map((chain) => (
          <button className="chain-row" type="button" key={chain.title}>
            <div className="mini-chain" aria-hidden="true">
              {chain.initials.map((initials, index) => <span className={`mini-chain__node mini-chain__node--${chain.tone}`} style={{ zIndex: 5 - index }} key={initials}>{initials}</span>)}
            </div>
            <div className="chain-row__copy"><strong>{chain.title}</strong><small>{chain.people} people · {chain.reach}</small></div>
            <span className="chain-status"><span />{chain.status}</span>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </div>

      <div className="chain-explainer">
        <span className="rail-icon rail-icon--violet"><Link2 aria-hidden="true" /></span>
        <div><strong>How chains work</strong><p>Complete a Ralli, pass it to someone, and watch every response add a new link.</p></div>
        <Zap aria-hidden="true" />
      </div>
    </section>
  )
}
