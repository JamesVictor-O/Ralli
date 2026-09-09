import { useCallback, useEffect, useMemo, useState } from 'react'
import { LoaderCircle, Search, Sparkles, UsersRound } from 'lucide-react'
import type { Dare } from '../discover/DareCard.tsx'
import { CommunityCard } from './CommunityCard.tsx'
import { CommunityDetail } from './CommunityDetail.tsx'
import { fetchCommunities, setCommunityMembership, type Community } from '../../lib/communities.ts'
import { useBackend } from '../../store/backend.ts'
import { actionableError } from '../../lib/errors.ts'

export function CommunityHub({ initialSlug, onSlugChange, onOpenRalli, onJoinRalli, onBoost, onCreate }: {
  initialSlug?: string | null
  onSlugChange: (slug: string | null) => void
  onOpenRalli: (ralli: Dare) => void
  onJoinRalli: (ralli: Dare) => void
  onBoost: (ralli: Dare) => void
  onCreate: (community: { id: string; name: string; icon: string }) => void
}) {
  const { user } = useBackend()
  const [communities, setCommunities] = useState<Community[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setCommunities(await fetchCommunities(user?.id)) }
    catch (failure) { setError(actionableError(failure, 'Communities could not be loaded.')) }
    finally { setLoading(false) }
  }, [user])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return communities
    return communities.filter((community) => `${community.name} ${community.description}`.toLowerCase().includes(needle))
  }, [communities, query])
  const discoverable = query ? filtered : filtered.filter((community) => !community.joined)

  function open(slug: string | null) { onSlugChange(slug); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  async function toggle(community: Community) {
    if (!user) return
    const joined = !community.joined
    setCommunities((current) => current.map((item) => item.id === community.id ? { ...item, joined, members: Math.max(0, item.members + (joined ? 1 : -1)) } : item))
    try { await setCommunityMembership(community.id, user.id, joined) }
    catch (failure) {
      setCommunities((current) => current.map((item) => item.id === community.id ? community : item))
      setError(actionableError(failure, 'Your community membership could not be updated.'))
    }
  }

  if (initialSlug) return <CommunityDetail slug={initialSlug} onBack={() => { void load(); open(null) }} onOpenRalli={onOpenRalli} onJoinRalli={onJoinRalli} onBoost={onBoost} onCreate={onCreate} />

  return (
    <section className="community-hub">
      <header className="community-hub__hero"><span className="community-hub__mark"><UsersRound aria-hidden="true" /></span><div><p className="eyebrow">Find your people</p><h1>Do more of what you love. Together.</h1><p>Communities are places where the next Ralli, response, and chain starts with people who are into the same things.</p></div></header>
      <label className="community-search"><Search aria-hidden="true" /><span className="sr-only">Search communities</span><input type="search" placeholder="Search photography, music, Nigeria…" value={query} onChange={(event) => setQuery(event.target.value)} /></label>
      {error && <p className="payment-error" role="alert">{error}</p>}
      {loading ? <div className="community-loading" role="status"><LoaderCircle className="spin" aria-hidden="true" /> Finding your communities…</div> : (
        <>
          {communities.some((community) => community.joined) && !query && <section className="community-group" aria-labelledby="your-communities"><div className="community-group__heading"><p className="eyebrow">Come back together</p><h2 id="your-communities">Your communities</h2></div><div className="community-grid">{communities.filter((community) => community.joined).map((community) => <CommunityCard key={community.id} community={community} onOpen={() => open(community.slug)} onMembership={() => void toggle(community)} />)}</div></section>}
          <section className="community-group" aria-labelledby="discover-communities"><div className="community-group__heading"><p className="eyebrow">Suggested for you</p><h2 id="discover-communities">Places worth joining</h2></div>
            {discoverable.length ? <div className="community-grid">{discoverable.map((community) => <CommunityCard key={community.id} community={community} onOpen={() => open(community.slug)} onMembership={() => void toggle(community)} />)}</div>
              : <div className="community-empty"><span><Sparkles aria-hidden="true" /></span><h3>No community matches that yet.</h3><p>Try another interest. New places will grow as Ralli grows.</p></div>}
          </section>
        </>
      )}
    </section>
  )
}
