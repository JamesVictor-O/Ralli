import { useEffect, useMemo, useState } from 'react'
import { ArrowUpRight, Clock3, Globe2, Search, Sparkles, UsersRound, X, Zap } from 'lucide-react'

export type SearchResultId = 'desk' | 'cities' | 'chains'

const results = [
  {
    id: 'desk' as const,
    title: 'Show us the weirdest thing on your desk.',
    description: '84 responses · 12 NIM reward',
    category: 'Just for fun',
    icon: Sparkles,
    tone: 'coral',
  },
  {
    id: 'cities' as const,
    title: '100 cities in 24 hours',
    description: '73 cities reached · 1,406 people',
    category: 'Community',
    icon: Globe2,
    tone: 'violet',
  },
  {
    id: 'chains' as const,
    title: 'Rallis travelling around the world',
    description: 'Explore active Ralli Chains',
    category: 'Chains',
    icon: Zap,
    tone: 'lime',
  },
]

export function SearchPanel({ onClose, onSelect }: { onClose: () => void; onSelect: (id: SearchResultId) => void }) {
  const [query, setQuery] = useState('')

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const matchingResults = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) return results
    return results.filter((result) =>
      [result.title, result.description, result.category].some((value) => value.toLowerCase().includes(normalizedQuery)),
    )
  }, [query])

  return (
    <div className="search-backdrop" role="dialog" aria-modal="true" aria-labelledby="search-title">
      <section className="search-panel">
        <header className="search-panel__header">
          <label className="sr-only" htmlFor="ralli-search" id="search-title">Search Rallis</label>
          <Search aria-hidden="true" />
          <input id="ralli-search" type="search" autoComplete="off" autoFocus
            placeholder="Search challenges, people, or chains…" value={query}
            onChange={(event) => setQuery(event.target.value)} />
          {query && <button type="button" onClick={() => setQuery('')}>Clear</button>}
          <button className="search-close" type="button" aria-label="Close search" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {!query && (
          <div className="search-suggestions">
            <span><Clock3 aria-hidden="true" />Recent</span>
            {['City', 'NIM reward', 'Chain'].map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => setQuery(suggestion)}>{suggestion}</button>
            ))}
          </div>
        )}

        <div className="search-results" aria-live="polite">
          <p className="search-results__label">{query ? `${matchingResults.length} results` : 'Popular right now'}</p>
          {matchingResults.length ? matchingResults.map((result) => {
            const Icon = result.icon
            return (
              <button className="search-result" type="button" key={result.id} onClick={() => onSelect(result.id)}>
                <span className={`event-icon event-icon--${result.tone}`}><Icon aria-hidden="true" /></span>
                <span><small>{result.category}</small><strong>{result.title}</strong><span>{result.description}</span></span>
                <ArrowUpRight aria-hidden="true" />
              </button>
            )
          }) : (
            <div className="search-empty">
              <span><UsersRound aria-hidden="true" /></span>
              <h2>No Rallis found</h2>
              <p>Try a broader idea like “city,” “fun,” or “chain.”</p>
              <button className="button button--soft" type="button" onClick={() => setQuery('')}>Clear search</button>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
