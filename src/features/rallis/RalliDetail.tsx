import { useEffect, useState } from 'react'
import { ArrowLeft, Clock3, Heart, Repeat2, Share2, UsersRound, X } from 'lucide-react'
import { Boost } from '../rewards/Boost.tsx'
import { RewardPool } from '../rewards/RewardPool.tsx'
import { ResponseViewer } from '../responses/ResponseViewer.tsx'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import type { Dare } from '../discover/DareCard.tsx'

function hoursLeft(endsAt?: string) {
  if (!endsAt) return '—'
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 3_600_000))
  return hours > 24 ? `${Math.ceil(hours / 24)}d` : `${hours}h`
}

function isExpired(endsAt?: string) {
  return endsAt ? new Date(endsAt).getTime() <= Date.now() : false
}

export function RalliDetail({ ralli, onClose, onJoin }: { ralli: Dare; onClose: () => void; onJoin: () => void }) {
  const [boostOpen, setBoostOpen] = useState(false)
  const expired = isExpired(ralli.endsAt)
  useBodyScrollLock()
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="ralli-title">
      <section className="flow-sheet flow-sheet--detail">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /><span>Discover</span></button>
          <button className="icon-button" type="button" aria-label="Close Ralli" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        <div className="detail-hero">
          <img src={ralli.image} alt={ralli.imageAlt} width="900" height="650" />
          <span className="pill pill--dark">{ralli.category}</span>
        </div>

        <div className="detail-body">
          <div className="author detail-author">
            <Avatar initials={ralli.initials} avatarUrl={ralli.authorAvatarUrl} className="avatar--author avatar--coral" />
            <span><strong>{ralli.author} started this Ralli</strong><small>{ralli.time} ago</small></span>
            <button className="icon-button" type="button" aria-label="Share Ralli" onClick={() => void navigator.share?.({ title: ralli.prompt, url: `${window.location.origin}${window.location.pathname}?ralli=${ralli.id}` })}><Share2 aria-hidden="true" /></button>
          </div>
          <h1 id="ralli-title">{ralli.prompt}</h1>
          {ralli.description && <p className="detail-copy">{ralli.description}</p>}

          <div className="detail-stats">
            <span><UsersRound aria-hidden="true" /><strong>{ralli.participants}</strong><small>responses</small></span>
            <span><Heart aria-hidden="true" /><strong>{ralli.reactions}</strong><small>reactions</small></span>
            <span><Repeat2 aria-hidden="true" /><strong>{ralli.passes}</strong><small>passes</small></span>
            <span><Clock3 aria-hidden="true" /><strong>{hoursLeft(ralli.endsAt)}</strong><small>left</small></span>
          </div>

          <div className="reward-callout">
            <div><p className="eyebrow">NIM makes the crowd count</p><h2>The favourite response earns the pool.</h2></div>
            <p>
              {ralli.boostCount > 0
                ? `🔥 ${ralli.boostCount} ${ralli.boostCount === 1 ? 'person has' : 'people have'} boosted this — ${ralli.reward} NIM behind it so far.`
                : ralli.starterReward > 0
                  ? `${ralli.author} kickstarted it with ${ralli.starterReward} NIM. Be the first to boost it.`
                  : 'Nobody has put NIM behind this yet. Boost it to make it worth chasing.'}
            </p>
          </div>
          <RewardPool total={ralli.reward} starter={ralli.starterReward} boosts={ralli.boosts} onBoost={() => setBoostOpen(true)} />

          <ResponseViewer ralliId={ralli.id} prompt={ralli.prompt} />
        </div>

        <footer className="flow-actions">
          {expired
            ? <span className="ralli-ended-note">This Ralli has ended — no new responses can be posted.</span>
            : <button className="button button--ink button--wide" type="button" onClick={onJoin}>Join this Ralli <ArrowLeft className="arrow-forward" aria-hidden="true" /></button>}
        </footer>
      </section>
      {boostOpen && <Boost ralliId={ralli.id} creator={ralli.author} ralli={ralli.prompt} pool={ralli.reward} onClose={() => setBoostOpen(false)} />}
    </div>
  )
}
