import { useState } from 'react'
import { ChevronRight, Heart, Repeat2, UsersRound, Zap } from 'lucide-react'

export interface Dare {
  id: string; author: string; initials: string; time: string; prompt: string; category: string
  participants: number; reactions: number; reward: number; image: string; imageAlt: string
  tone: 'coral' | 'violet'
}

export function DareCard({ dare, onOpen, onJoin }: { dare: Dare; onOpen: () => void; onJoin: () => void }) {
  const [liked, setLiked] = useState(false)
  return (
    <article className="dare-card">
      <div className="dare-card__top">
        <div className="author">
          <span className={`avatar avatar--author avatar--${dare.tone}`}>{dare.initials}</span>
          <span><strong>{dare.author} started a Ralli</strong><small>{dare.time} ago · {dare.category}</small></span>
        </div>
        <span className="reward-pill"><Zap aria-hidden="true" />{dare.reward} NIM</span>
      </div>
      <button className="dare-card__title" type="button" onClick={onOpen}>{dare.prompt}</button>
      <div className="dare-card__media">
        <img src={dare.image} alt={dare.imageAlt} width="720" height="520" />
        <div className="media-badge"><UsersRound aria-hidden="true" /><span><strong>{dare.participants}</strong> responses</span></div>
      </div>
      <div className="dare-card__meta">
        <button className={`reaction-button ${liked ? 'is-liked' : ''}`} type="button" aria-pressed={liked} onClick={() => setLiked((value) => !value)}>
          <Heart aria-hidden="true" fill={liked ? 'currentColor' : 'none'} /><span>{dare.reactions + (liked ? 1 : 0)}</span>
        </button>
        <span><Repeat2 aria-hidden="true" /> Passed 17 times</span>
        <button className="join-button" type="button" onClick={onJoin}>Join Ralli <ChevronRight aria-hidden="true" /></button>
      </div>
    </article>
  )
}
