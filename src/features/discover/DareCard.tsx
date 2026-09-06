import { type KeyboardEvent, type MouseEvent } from 'react'
import { ChevronRight, Coins, Heart, UsersRound } from 'lucide-react'

export interface Dare {
  id: string; author: string; initials: string; time: string; prompt: string; category: string
  participants: number; reactions: number; passes: number; reward: number; starterReward: number; boosts: number; boostCount: number; image: string; imageAlt: string
  tone: 'coral' | 'violet'
  description?: string; endsAt?: string; creatorId?: string
}

export function DareCard({ dare, onOpen, onJoin, onBoost }: { dare: Dare; onOpen: () => void; onJoin: () => void; onBoost: () => void }) {
  function isInteractiveTarget(target: EventTarget | null) {
    return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, [role="button"]'))
  }

  function openFromCard(event: MouseEvent<HTMLElement>) {
    if (!isInteractiveTarget(event.target)) onOpen()
  }

  function openFromKeyboard(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <article className="dare-card" role="link" tabIndex={0} aria-label={`Open Ralli: ${dare.prompt}`}
      onClick={openFromCard} onKeyDown={openFromKeyboard}>
      <div className="dare-card__top">
        <div className="author">
          <span className={`avatar avatar--author avatar--${dare.tone}`}>{dare.initials}</span>
          <span><strong>{dare.author} started a Ralli</strong><small>{dare.time} ago · {dare.category}</small></span>
        </div>
        <span className="ralli-funded">
          {dare.boostCount > 0 ? `🔥 ${dare.boostCount} boosted` : dare.reward > 0 ? 'Funded Ralli' : 'Open Ralli'}
        </span>
      </div>
      <h3 className="dare-card__title">{dare.prompt}</h3>
      <div className="dare-card__media">
        <img src={dare.image} alt={dare.imageAlt} width="720" height="520" />
        <div className="media-badge"><UsersRound aria-hidden="true" /><span><strong>{dare.participants}</strong> responses</span></div>
      </div>
      <div className="dare-card__meta">
        <span className="reaction-button" aria-label={`${dare.reactions} response reactions`}>
          <Heart aria-hidden="true" /><span>{dare.reactions}</span>
        </span>
        <button className="nim-pool-chip" type="button" onClick={onBoost} aria-label={`${dare.reward} NIM behind this Ralli — tap to boost the pool`}>
          <Coins aria-hidden="true" /><span>{dare.reward} NIM</span>
        </button>
        <button className="join-button" type="button" onClick={onJoin}>Join Ralli <ChevronRight aria-hidden="true" /></button>
      </div>
    </article>
  )
}
