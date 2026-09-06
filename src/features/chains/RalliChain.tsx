import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, ChevronRight, Link2, LoaderCircle, Repeat2, Sparkles, Zap } from 'lucide-react'
import { fetchMyChains } from '../../lib/profile.ts'
import { useBackend } from '../../store/backend.ts'

type Chain = Awaited<ReturnType<typeof fetchMyChains>>[number]

export function RalliChain() {
  const [chains, setChains] = useState<Chain[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const { user } = useBackend()
  const load = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    try { const data = await fetchMyChains(user.id); setChains(data); setStatus(data.length ? 'success' : 'empty') }
    catch { setStatus('error') }
  }, [user])
  useEffect(() => { void Promise.resolve().then(load) }, [load])

  return <section className="page-view" aria-labelledby="chains-title">
    <header className="page-heading"><div><p className="eyebrow">See where it travelled</p><h1 id="chains-title">Ralli Chains</h1></div><span className="rail-icon rail-icon--violet"><Link2 aria-hidden="true" /></span></header>
    {status === 'loading' && <div className="empty-state" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /><h2>Loading your chains…</h2></div>}
    {status === 'error' && <div className="empty-state" role="alert"><AlertCircle aria-hidden="true" /><h2>Chains didn’t load</h2><button className="button button--ink" type="button" onClick={() => void load()}>Try again</button></div>}
    {status === 'empty' && <div className="empty-state"><Sparkles aria-hidden="true" /><h2>No chain links yet</h2><p>Respond to a Ralli, pass it on, and its journey will begin here.</p></div>}
    {status === 'success' && <><article className="chain-spotlight"><div className="chain-spotlight__copy"><span className="pill pill--dark"><Repeat2 aria-hidden="true" />Your latest pass</span><div><p className="eyebrow">Moving through the community</p><h2>{chains[0].prompt}</h2></div><div className="chain-summary"><span><Zap aria-hidden="true" /><strong>{chains[0].passes}</strong> recorded {chains[0].passes === 1 ? 'pass' : 'passes'}</span></div></div></article><div className="section-heading"><div><p className="eyebrow">Your journeys</p><h2>Chains you touched</h2></div><span>{chains.length} active</span></div><div className="chain-list">{chains.map((chain) => <a className="chain-row" href={`?ralli=${chain.id}`} key={chain.id}><span className="rail-icon rail-icon--lime"><Link2 aria-hidden="true" /></span><div className="chain-row__copy"><strong>{chain.prompt}</strong><small>{chain.passes} pass{chain.passes === 1 ? '' : 'es'} recorded</small></div><ChevronRight aria-hidden="true" /></a>)}</div></>}
    <div className="chain-explainer"><span className="rail-icon rail-icon--violet"><Link2 aria-hidden="true" /></span><div><strong>How chains work</strong><p>Complete a Ralli, pass it to someone, and every recorded share adds a link.</p></div><Zap aria-hidden="true" /></div>
  </section>
}
