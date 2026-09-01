import { type KeyboardEvent, type MouseEvent, useState } from 'react'
import { ChevronRight, Heart, Repeat2, UsersRound } from 'lucide-react'
import { ResponsePreview } from './ResponsePreview.tsx'
import { RewardPool } from '../rewards/RewardPool.tsx'

export interface Dare {
  id: string; author: string; initials: string; time: string; prompt: string; category: string
  participants: number; reactions: number; passes: number; reward: number; starterReward: number; boosts: number; image: string; imageAlt: string
  tone: 'coral' | 'violet'
}

export function DareCard({ dare, onOpen, onJoin, onBoost }: { dare: Dare; onOpen: () => void; onJoin: () => void; onBoost: () => void }) {
  const [liked, setLiked] = useState(false)

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
        <span className="ralli-funded">{dare.reward > 0 ? 'Funded Ralli' : 'Open Ralli'}</span>
      </div>
      <h3 className="dare-card__title">{dare.prompt}</h3>
      <RewardPool total={dare.reward} starter={dare.starterReward} boosts={dare.boosts} onBoost={onBoost} compact />
      <div className="dare-card__media">
        <img src={dare.image} alt={dare.imageAlt} width="720" height="520" />
        <div className="media-badge"><UsersRound aria-hidden="true" /><span><strong>{dare.participants}</strong> responses</span></div>
      </div>
      <div className="dare-card__meta">
        <button className={`reaction-button ${liked ? 'is-liked' : ''}`} type="button" aria-pressed={liked} onClick={() => setLiked((value) => !value)}>
          <Heart aria-hidden="true" fill={liked ? 'currentColor' : 'none'} /><span>{dare.reactions + (liked ? 1 : 0)}</span>
        </button>
        <span><Repeat2 aria-hidden="true" /> Passed {dare.passes} times</span>
        <button className="join-button" type="button" onClick={onJoin}>Join Ralli <ChevronRight aria-hidden="true" /></button>
      </div>
      <ResponsePreview
        author={dare.id === 'desk' ? 'Victor K.' : 'Lea M.'}
        initials={dare.id === 'desk' ? 'VK' : 'LM'}
        copy={dare.id === 'desk' ? 'A ceramic frog holding my emergency paper clips. His name is Gerald.' : 'The sky went full movie poster for five minutes.'}
        image={dare.id === 'desk'
          ? 'https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=500&q=80'
          : 'https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=500&q=80'}
        imageAlt={dare.id === 'desk' ? 'Colourful objects on a creative desk' : 'A person beneath a dramatic evening sky'}
        reactions={dare.id === 'desk' ? 86 : 121}
        onOpen={onOpen}
      />
    </article>
  )
}
