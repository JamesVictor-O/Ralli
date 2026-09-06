import { DareCard, type Dare } from './DareCard.tsx'
import { AlertCircle, Sparkles } from 'lucide-react'
import { useRalliFeed } from '../../hooks/useRalliFeed.ts'
import { demoRallis } from './demoRallis.ts'

interface DareFeedProps {
  onOpen: (ralli: Dare) => void
  onJoin: (ralli: Dare) => void
  onBoost: (ralli: Dare) => void
  onCreate: () => void
  refreshKey?: number
}

export function DareFeed({ onOpen, onJoin, onBoost, onCreate, refreshKey = 0 }: DareFeedProps) {
  const { rallis, status, error, retry } = useRalliFeed(demoRallis, refreshKey)

  if (status === 'loading') {
    return <section className="dare-feed" aria-label="Loading Rallis" aria-busy="true">{[0, 1].map((item) => <div className="dare-card feed-skeleton" key={item}><span /><strong /><i /><div /></div>)}</section>
  }

  if (status === 'error') {
    return <section className="feed-state" role="alert"><span className="feed-state__icon feed-state__icon--error"><AlertCircle aria-hidden="true" /></span><h3>Couldn’t load the Rallis</h3><p>{error || 'This is usually a network hiccup.'}</p><button className="button button--ink" type="button" onClick={() => void retry()}>Try again</button></section>
  }

  if (status === 'empty') {
    return <section className="feed-state"><span className="feed-state__icon"><Sparkles aria-hidden="true" /></span><h3>The first Ralli starts here</h3><p>No one has started one yet. Give the community something worth joining.</p><button className="button button--ink" type="button" onClick={onCreate}>Start a Ralli</button></section>
  }

  return <section className="dare-feed" aria-label="Rallis for you">{rallis.map((ralli) => <DareCard dare={ralli} key={ralli.id} onOpen={() => onOpen(ralli)} onJoin={() => onJoin(ralli)} onBoost={() => onBoost(ralli)} />)}</section>
}
