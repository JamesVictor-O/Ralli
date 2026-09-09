import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ChevronRight, Link2, LoaderCircle, Repeat2, Sparkles, Zap } from 'lucide-react'
import { fetchMyChains } from '../../lib/profile.ts'
import { fetchRalliById } from '../../lib/rallis.ts'
import type { Dare } from '../discover/DareCard.tsx'
import { useBackend } from '../../store/backend.ts'
import { fetchInvitationConversion } from '../../lib/invitations.ts'

type Chain = Awaited<ReturnType<typeof fetchMyChains>>[number]

function relativeTime(value: string) {
  if (!value) return ''
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h ago`
  return `${Math.floor(minutes / 1_440)}d ago`
}

export function RalliChain({ onOpenRalli }: { onOpenRalli: (ralli: Dare) => void }) {
  const [chains, setChains] = useState<Chain[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [openingId, setOpeningId] = useState<string | null>(null)
  const [conversion, setConversion] = useState({ total: 0, opened: 0, responded: 0, rate: 0 })
  const { user } = useBackend()
  const load = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    try { const [data, metrics] = await Promise.all([fetchMyChains(user.id), fetchInvitationConversion(user.id)]); setChains(data); setConversion(metrics); setStatus(data.length ? 'success' : 'empty') }
    catch { setStatus('error') }
  }, [user])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  async function openChain(id: string) {
    if (openingId) return
    setOpeningId(id)
    try {
      const ralli = await fetchRalliById(id)
      onOpenRalli(ralli)
    } catch {
      // The Ralli may have been removed since this pass was recorded — nothing to open.
    } finally {
      setOpeningId(null)
    }
  }

  return <section className="page-view" aria-labelledby="chains-title">
    <header className="page-heading"><div><p className="eyebrow">See where it travelled</p><h1 id="chains-title">Ralli Chains</h1></div><span className="rail-icon rail-icon--violet"><Link2 aria-hidden="true" /></span></header>
    {status === 'loading' && <div className="empty-state" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /><h2>Loading your chains…</h2></div>}
    {status === 'error' && <div className="empty-state" role="alert"><AlertCircle aria-hidden="true" /><h2>Chains didn’t load</h2><button className="button button--ink" type="button" onClick={() => void load()}>Try again</button></div>}
    {status === 'empty' && <div className="empty-state"><Sparkles aria-hidden="true" /><h2>No chain links yet</h2><p>Respond to a Ralli, pass it on, and its journey will begin here.</p></div>}
    {status === 'success' && <>
      <div className="conversion-card" aria-label="Invitation conversion"><span><strong>{conversion.total}</strong><small>sent</small></span><span><strong>{conversion.opened}</strong><small>opened</small></span><span><strong>{conversion.responded}</strong><small>responded</small></span><span><strong>{conversion.rate}%</strong><small>conversion</small></span></div>
      <article className="chain-spotlight">
        <div className="chain-spotlight__copy">
          <span className="pill pill--dark"><Repeat2 aria-hidden="true" />Your latest pass</span>
          <div><p className="eyebrow">Moving through the community</p><h2>{chains[0].prompt}</h2></div>
          <div className="chain-summary"><span><Zap aria-hidden="true" /><strong>{chains[0].passes}</strong> recorded {chains[0].passes === 1 ? 'pass' : 'passes'}</span></div>
        </div>
        <button className="button button--ink" type="button" disabled={openingId === chains[0].id} aria-busy={openingId === chains[0].id} onClick={() => void openChain(chains[0].id)}>
          {openingId === chains[0].id && <LoaderCircle className="spin" aria-hidden="true" />}
          Open Ralli <ChevronRight aria-hidden="true" />
        </button>
      </article>
      <div className="section-heading"><div><p className="eyebrow">Your journeys</p><h2>Chains you touched</h2></div><span>{chains.length} active</span></div>
      <div className="chain-list">{chains.map((chain) => (
        <button className="chain-row" type="button" key={chain.id} disabled={openingId === chain.id} aria-busy={openingId === chain.id} onClick={() => void openChain(chain.id)}>
          <span className="rail-icon rail-icon--lime"><Link2 aria-hidden="true" /></span>
          <div className="chain-row__copy"><strong>{chain.prompt}</strong><small>{chain.passes} pass{chain.passes === 1 ? '' : 'es'} recorded · {relativeTime(chain.lastPassedAt)}</small></div>
          {openingId === chain.id ? <LoaderCircle className="spin" aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
      ))}</div>
    </>}
    <div className="chain-explainer"><span className="rail-icon rail-icon--violet"><Link2 aria-hidden="true" /></span><div><strong>How chains work</strong><p>Complete a Ralli, pass it to someone, and every recorded share adds a link.</p></div><Zap aria-hidden="true" /></div>
  </section>
}
