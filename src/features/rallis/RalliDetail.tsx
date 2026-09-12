import { useEffect, useState } from 'react'
import { ArrowLeft, Check, Clock3, Heart, Repeat2, Share2, UsersRound, X } from 'lucide-react'
import { Boost } from '../rewards/Boost.tsx'
import { RewardPool } from '../rewards/RewardPool.tsx'
import { ResponseViewer } from '../responses/ResponseViewer.tsx'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import type { Dare } from '../discover/DareCard.tsx'
import { hasResponded } from '../../lib/responses.ts'
import { useBackend } from '../../store/backend.ts'
import { PassItOn } from '../chains/PassItOn.tsx'
import { Comments } from '../responses/Comments.tsx'

function hoursLeft(endsAt?: string) {
  if (!endsAt) return '—'
  const hours = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 3_600_000))
  return hours > 24 ? `${Math.ceil(hours / 24)}d` : `${hours}h`
}

function isExpired(endsAt?: string) {
  return endsAt ? new Date(endsAt).getTime() <= Date.now() : false
}

export function RalliDetail({ ralli, unlockedResponseId, onClose, onJoin }: { ralli: Dare; unlockedResponseId?: string | null; onClose: () => void; onJoin: () => void }) {
  const [boostOpen, setBoostOpen] = useState(false)
  const [joinedFromBackend, setJoinedFromBackend] = useState(false)
  const [passOpen, setPassOpen] = useState(false)
  const [commentsOpen, setCommentsOpen] = useState(false)
  const { user } = useBackend()
  const joined = Boolean(unlockedResponseId) || joinedFromBackend
  const isCreator = Boolean(user && ralli.creatorId === user.id)
  const responsesUnlocked = joined || isCreator
  const expired = isExpired(ralli.endsAt)
  useBodyScrollLock()
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])
  useEffect(() => {
    let active = true
    if (unlockedResponseId) return () => { active = false }
    void (user ? hasResponded(ralli.id, user.id) : Promise.resolve(false))
      .then((value) => { if (active) setJoinedFromBackend(value) })
      .catch(() => { if (active) setJoinedFromBackend(false) })
    return () => { active = false }
  }, [ralli.id, unlockedResponseId, user])

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="ralli-title">
      <section className="flow-sheet flow-sheet--detail">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /><span>Discover</span></button>
          <button className="icon-button" type="button" aria-label="Close Ralli" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        <div className="detail-hero">
          <img src={ralli.image} alt={ralli.imageAlt} width="900" height="650" fetchPriority="high" decoding="async" />
          <span className="pill pill--dark">{ralli.category}</span>
        </div>

        <div className="detail-body">
          <div className="author detail-author">
            <Avatar initials={ralli.initials} avatarUrl={ralli.authorAvatarUrl} className="avatar--author avatar--coral" />
            <span className="detail-author__copy">
              <span><strong>{ralli.author}</strong><span>started this Ralli</span></span>
              <small>{ralli.time} ago</small>
            </span>
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
            <div><p className="eyebrow">NIM makes support real</p><h2>Boost the person who started it.</h2></div>
            <p>
              {ralli.boostCount > 0
                ? `🔥 ${ralli.boostCount} ${ralli.boostCount === 1 ? 'person has' : 'people have'} boosted this — ${ralli.reward} NIM behind it so far.`
                : ralli.starterReward > 0
                  ? `${ralli.author} has received ${ralli.starterReward} NIM.`
                  : `No boosts yet. Send NIM directly to ${ralli.author} to support this Ralli.`}
            </p>
          </div>
          <RewardPool total={ralli.reward} boosts={ralli.boosts} onBoost={() => setBoostOpen(true)} />

          {joined && unlockedResponseId && <section className="reciprocity-unlocked" aria-live="polite"><span><Check aria-hidden="true" /></span><div><p className="eyebrow">You showed up</p><h2>Everyone’s responses are unlocked.</h2><p>See their takes, react, then keep the challenge moving.</p></div><button className="button button--ink" type="button" onClick={() => setPassOpen(true)}>Challenge someone <Repeat2 aria-hidden="true" /></button></section>}
          <ResponseViewer ralliId={ralli.id} prompt={ralli.prompt} locked={!responsesUnlocked} onJoin={onJoin} />
          <section className="ralli-conversation" aria-labelledby="ralli-conversation-title"><div><p className="eyebrow">Talk about this Ralli</p><h2 id="ralli-conversation-title">Ralli conversation</h2></div><Comments ralliId={ralli.id} expanded={commentsOpen} onToggle={() => setCommentsOpen((value) => !value)} /></section>
        </div>

        <footer className="flow-actions">
          {expired
            ? <span className="ralli-ended-note">This Ralli has ended — no new responses can be posted.</span>
            : isCreator
              ? <span className="ralli-ended-note"><Check aria-hidden="true" /> You’re hosting this Ralli — responses are open to you</span>
              : joined
              ? <span className="ralli-ended-note"><Check aria-hidden="true" /> You showed up for this Ralli</span>
              : <button className="button button--ink button--wide" type="button" onClick={onJoin}>Join this Ralli <ArrowLeft className="arrow-forward" aria-hidden="true" /></button>}
        </footer>
      </section>
      {boostOpen && <Boost ralliId={ralli.id} creator={ralli.author} ralli={ralli.prompt} pool={ralli.reward} onClose={() => setBoostOpen(false)} />}
      {passOpen && unlockedResponseId && <PassItOn ralliId={ralli.id} responseId={unlockedResponseId} prompt={ralli.prompt} responseAuthor="You" onClose={() => setPassOpen(false)} />}
    </div>
  )
}
