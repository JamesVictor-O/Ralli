import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Coins, Heart, LoaderCircle, Plus, RefreshCw, Sparkles, UsersRound, Zap } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar.tsx'
import type { Dare } from '../discover/DareCard.tsx'
import { fetchCommunityDetail, setCommunityMembership, type CommunityDetailData } from '../../lib/communities.ts'
import { useBackend } from '../../store/backend.ts'
import { actionableError } from '../../lib/errors.ts'

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

export function CommunityDetail({ slug, onBack, onOpenRalli, onJoinRalli, onBoost, onCreate }: {
  slug: string
  onBack: () => void
  onOpenRalli: (ralli: Dare) => void
  onJoinRalli: (ralli: Dare) => void
  onBoost: (ralli: Dare) => void
  onCreate: (community: { id: string; name: string; icon: string }) => void
}) {
  const { user } = useBackend()
  const [data, setData] = useState<CommunityDetailData | null>(null)
  const [error, setError] = useState('')
  const [membershipBusy, setMembershipBusy] = useState(false)

  const load = useCallback(async () => {
    setError('')
    try {
      setData(await fetchCommunityDetail(slug, user?.id))
    } catch (failure) {
      setError(actionableError(failure, 'This community could not be loaded.'))
    }
  }, [slug, user])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function toggleMembership() {
    if (!data || !user || membershipBusy) return
    setMembershipBusy(true)
    const joining = !data.community.joined
    setData({ ...data, community: { ...data.community, joined: joining, members: Math.max(0, data.community.members + (joining ? 1 : -1)) } })
    try {
      await setCommunityMembership(data.community.id, user.id, joining)
    } catch (failure) {
      setData(data)
      setError(actionableError(failure, 'Your community membership could not be updated.'))
    } finally {
      setMembershipBusy(false)
    }
  }

  if (error && !data) return (
    <section className="community-page community-state" role="alert">
      <span><RefreshCw aria-hidden="true" /></span><h1>We lost the trail.</h1><p>{error}</p>
      <button className="button button--ink" type="button" onClick={() => void load()}>Try again</button>
      <button className="text-button" type="button" onClick={onBack}>Back to Communities</button>
    </section>
  )
  if (!data) return <div className="community-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /> Loading community…</div>

  const { community, daily, happening, chains, responses, members } = data
  return (
    <section className="community-page">
      <button className="community-back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /> All communities</button>
      <header className="community-detail-header">
        <span className="community-detail-header__icon" aria-hidden="true">{community.icon}</span>
        <div><p className="eyebrow">A place to do things together</p><h1>{community.name}</h1><p>{community.description}</p>
          <span className="community-member-count"><UsersRound aria-hidden="true" /> {compact.format(community.members)} members</span>
        </div>
        <button className={`button ${community.joined ? 'button--soft' : 'button--ink'}`} type="button"
          disabled={!user || membershipBusy} aria-busy={membershipBusy} onClick={() => void toggleMembership()}>
          {community.joined ? 'Joined' : 'Join community'}
        </button>
      </header>
      {error && <p className="payment-error" role="alert">{error}</p>}

      <section className="community-section" aria-labelledby="community-today">
        <div className="community-section__heading"><div><p className="eyebrow">Today in {community.name}</p><h2 id="community-today">One prompt. Everyone’s take.</h2></div></div>
        {daily ? (
          <article className="community-daily">
            <div className="community-daily__copy"><span className="community-daily__label"><Sparkles aria-hidden="true" /> Community Daily Ralli</span>
              <h3>{daily.prompt}</h3>
              <p className="community-daily__participation"><UsersRound aria-hidden="true" /> {compact.format(daily.participants)} {daily.participants === 1 ? 'person has' : 'people have'} joined today</p>
              <div><button className="button button--ink" type="button" onClick={() => onJoinRalli(daily)}>Join today’s Ralli <ArrowRight aria-hidden="true" /></button>
                <button className="text-button" type="button" onClick={() => onOpenRalli(daily)}>See responses <ArrowRight aria-hidden="true" /></button></div>
            </div>
            <button className="community-daily__media" type="button" onClick={() => onOpenRalli(daily)} aria-label={`Open ${daily.prompt}`}>
              <img src={daily.image} alt={daily.imageAlt} width="720" height="520" decoding="async" />
            </button>
          </article>
        ) : (
          <div className="community-empty"><span><Sparkles aria-hidden="true" /></span><h3>Today starts with you.</h3><p>Start the first Ralli people in {community.name} can do together.</p><button className="button button--ink" type="button" onClick={() => onCreate(community)}>Start a Ralli here</button></div>
        )}
      </section>

      <section className="community-section" aria-labelledby="community-happening">
        <div className="community-section__heading"><div><p className="eyebrow">Blowing up</p><h2 id="community-happening">Happening now</h2></div><button className="community-create-link" type="button" onClick={() => onCreate(community)}><Plus aria-hidden="true" /> Start one here</button></div>
        {happening.length ? <div className="community-ralli-list">{happening.map((ralli) => (
          <article className="community-ralli-row" key={ralli.id}>
            <button className="community-ralli-row__hit" type="button" aria-label={`Open Ralli: ${ralli.prompt}`} onClick={() => onOpenRalli(ralli)} />
            <img src={ralli.image} alt="" width="160" height="120" loading="lazy" decoding="async" />
            <div><p>{ralli.author} started this</p><h3>{ralli.prompt}</h3><span><UsersRound aria-hidden="true" /> {compact.format(ralli.participants)} responses</span>{ralli.boosts > 0 && <span className="community-nim"><Coins aria-hidden="true" /> {ralli.boosts} NIM boosted</span>}</div>
            <div className="community-ralli-row__actions"><button className="community-boost" type="button" onClick={(event) => { event.stopPropagation(); onBoost(ralli) }}><Zap aria-hidden="true" /> Boost</button><button className="join-button" type="button" onClick={(event) => { event.stopPropagation(); onJoinRalli(ralli) }}>Join <ArrowRight aria-hidden="true" /></button></div>
          </article>
        ))}</div> : <div className="community-empty community-empty--small"><p>No other Rallis are moving here yet. Start something people cannot resist joining.</p></div>}
      </section>

      <section className="community-section" aria-labelledby="community-chains">
        <div className="community-section__heading"><div><p className="eyebrow">Passing from person to person</p><h2 id="community-chains">Active chains</h2></div></div>
        {chains.length ? <div className="community-chain-list">{chains.map((chain) => (
          <button className="community-chain" type="button" key={chain.ralli.id} onClick={() => onOpenRalli(chain.ralli)}>
            <span className="community-chain__zap"><Zap aria-hidden="true" /></span><span><strong>{chain.ralli.prompt}</strong><small>{chain.people} people in this chain</small>
              <span className="community-chain__places">{chain.locations.length ? chain.locations.slice(0, 5).join(' → ') : 'The next stop could be you'}</span></span><ArrowRight aria-hidden="true" />
          </button>
        ))}</div> : <div className="community-empty community-empty--small"><p>No Ralli has been passed on here yet. Join one, respond, then challenge someone next.</p></div>}
      </section>

      <section className="community-section" aria-labelledby="community-responses">
        <div className="community-section__heading"><div><p className="eyebrow">Content causes more content</p><h2 id="community-responses">Recent responses</h2></div></div>
        {responses.length ? <div className="community-response-grid">{responses.map((response) => (
          <button className={`community-response community-response--${response.format}`} type="button" key={response.id} onClick={() => onOpenRalli(response.ralli)}>
            {response.mediaUrl && response.format === 'video' && <video src={response.mediaUrl} muted playsInline preload="metadata" />}
            {response.mediaUrl && response.format !== 'video' && <img src={response.mediaUrl} alt="" loading="lazy" decoding="async" />}
            {!response.mediaUrl && <span className="community-response__text">{response.copy || response.ralli.prompt}</span>}
            <span className="community-response__meta"><Avatar initials={response.initials} avatarUrl={response.avatarUrl} /><span><strong>{response.author}</strong><small>{response.ralli.prompt}</small></span><span><Heart aria-hidden="true" /> {response.reactions}</span></span>
          </button>
        ))}</div> : <div className="community-empty community-empty--small"><p>The first response will set this place in motion.</p></div>}
      </section>

      <section className="community-section community-people" aria-labelledby="community-people">
        <div className="community-section__heading"><div><p className="eyebrow">People showing up</p><h2 id="community-people">Members</h2></div></div>
        {members.length ? <div className="community-member-list">{members.map((member) => <div className="community-member" key={member.id}><Avatar initials={member.initials} avatarUrl={member.avatarUrl} /><span><strong>{member.name}</strong><small>{member.role === 'member' ? 'Participating' : member.role}</small></span></div>)}</div>
          : <div className="community-empty community-empty--small"><p>Join now and become one of the people who starts this community.</p></div>}
      </section>
    </section>
  )
}
