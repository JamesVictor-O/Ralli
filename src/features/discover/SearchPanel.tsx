import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, ArrowUpRight, Search, Sparkles, UsersRound, X } from 'lucide-react'
import { fetchRalliFeed } from '../../lib/rallis.ts'
import type { Dare } from './DareCard.tsx'

export function SearchPanel({ onClose, onSelect }: { onClose: () => void; onSelect: (ralli: Dare) => void }) {
  const [query, setQuery] = useState('')
  const [rallis, setRallis] = useState<Dare[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    void fetchRalliFeed().then((data) => { setRallis(data); setStatus('success') }).catch(() => setStatus('error'))
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  const matches = useMemo(() => {
    const value = query.trim().toLowerCase()
    if (!value) return rallis
    return rallis.filter((ralli) => [ralli.prompt, ralli.author, ralli.category].some((field) => field.toLowerCase().includes(value)))
  }, [query, rallis])

  return <div className="search-backdrop" role="dialog" aria-modal="true" aria-labelledby="search-title"><section className="search-panel">
    <header className="search-panel__header"><label className="sr-only" htmlFor="ralli-search" id="search-title">Search Rallis</label><Search aria-hidden="true" /><input id="ralli-search" type="search" autoComplete="off" autoFocus placeholder="Search challenges or people…" value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button type="button" onClick={() => setQuery('')}>Clear</button>}<button className="search-close" type="button" aria-label="Close search" onClick={onClose}><X aria-hidden="true" /></button></header>
    <div className="search-results" aria-live="polite"><p className="search-results__label">{status === 'loading' ? 'Loading Rallis…' : `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`}</p>
      {status === 'error' ? <div className="search-empty" role="alert"><span><AlertCircle aria-hidden="true" /></span><h2>Search didn’t load</h2><p>Close search and try again.</p></div> : matches.length ? matches.map((ralli) => <button className="search-result" type="button" key={ralli.id} onClick={() => onSelect(ralli)}><span className="event-icon event-icon--coral"><Sparkles aria-hidden="true" /></span><span><small>{ralli.category}</small><strong>{ralli.prompt}</strong><span>{ralli.participants} responses · {ralli.reward} NIM</span></span><ArrowUpRight aria-hidden="true" /></button>) : status === 'success' && <div className="search-empty"><span><UsersRound aria-hidden="true" /></span><h2>No Rallis found</h2><p>{query ? 'Try a broader search.' : 'Start the first Ralli and it will appear here.'}</p></div>}
    </div>
  </section></div>
}
