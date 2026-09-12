import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertCircle, ArrowRight, Check, Flag, LoaderCircle, MoreHorizontal, Repeat2, Share2, Sparkles, X } from 'lucide-react'
import { Reactions } from './Reactions.tsx'
import { TipChip } from './TipChip.tsx'
import { PassItOn } from '../chains/PassItOn.tsx'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { blockUser, deleteResponse, fetchResponses, reportResponse, type RalliResponse } from '../../lib/responses.ts'
import { useBackend } from '../../store/backend.ts'
import { useDialogFocus } from '../../hooks/useDialogFocus.ts'
import { actionableError } from '../../lib/errors.ts'
import { FeedVideo } from '../../components/media/FeedVideo.tsx'
import { trackProductEvent } from '../../lib/analytics.ts'
import { Comments } from './Comments.tsx'

type Sort = 'Popular' | 'Newest'

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export function ResponseViewer({ ralliId, prompt, locked = false, onJoin }: { ralliId: string; prompt: string; locked?: boolean; onJoin?: () => void }) {
  const [sort, setSort] = useState<Sort>('Popular')
  const [passResponse, setPassResponse] = useState<RalliResponse | null>(null)
  const [responses, setResponses] = useState<RalliResponse[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')
  const [reportTarget, setReportTarget] = useState<RalliResponse | null>(null)
  const [reportState, setReportState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [reportReason, setReportReason] = useState<'spam' | 'harassment' | 'unsafe' | 'copyright' | 'other'>('spam')
  const [commentsOpen, setCommentsOpen] = useState<string | null>(null)
  const reportDialogRef = useRef<HTMLElement>(null)
  const viewedForRalli = useRef<string | null>(null)
  const { user } = useBackend()
  const closeReport = useCallback(() => setReportTarget(null), [])
  useDialogFocus(reportDialogRef, Boolean(reportTarget), closeReport)

  const load = useCallback(async () => {
    setStatus('loading')
    setError('')
    try {
      const data = await fetchResponses(ralliId, user?.id ?? null)
      setResponses(data)
      setStatus(data.length ? 'success' : 'empty')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Responses could not be loaded.')
      setStatus('error')
    }
  }, [ralliId, user])

  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => {
    if (!user || locked || status !== 'success' || viewedForRalli.current === ralliId) return
    viewedForRalli.current = ralliId
    trackProductEvent('responses_viewed', { userId: user.id, ralliId, source: 'ralli_detail', properties: { response_count: responses.length } })
  }, [locked, ralliId, responses.length, status, user])

  const orderedResponses = useMemo(() => [...responses].sort((left, right) => sort === 'Popular'
    ? right.reactions - left.reactions
    : new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [responses, sort])

  async function submitReport() {
    if (!user || !reportTarget) return
    setReportState('saving')
    try {
      await reportResponse(reportTarget.id, user.id, reportReason)
      setReportState('saved')
    } catch {
      setReportState('error')
    }
  }

  async function removeResponse(response: RalliResponse) {
    if (!user || !window.confirm('Delete this response permanently? This cannot be undone.')) return
    try { await deleteResponse(response.id, user.id); setResponses((items) => items.filter((item) => item.id !== response.id)) }
    catch (failure) { setError(actionableError(failure, 'The response could not be deleted. Try again.')); setStatus('error') }
  }

  async function blockAuthor() {
    if (!user || !reportTarget || !window.confirm(`Block ${reportTarget.author}? Their responses will be hidden from you.`)) return
    try { await blockUser(reportTarget.authorId, user.id); setResponses((items) => items.filter((item) => item.authorId !== reportTarget.authorId)); closeReport() }
    catch { setReportState('error') }
  }

  return (
    <section className="response-stream" aria-labelledby="responses-heading">
      <header className="response-stream__header">
        <div><p className="eyebrow">{responses.length} people tried it</p><h2 id="responses-heading">See how everyone did it</h2></div>
        <div className="response-sort" role="group" aria-label="Sort responses">
          {(['Popular', 'Newest'] as Sort[]).map((item) => <button className={sort === item ? 'is-active' : ''} type="button" aria-pressed={sort === item} key={item} onClick={() => setSort(item)}>{item}</button>)}
        </div>
      </header>
      {status === 'loading' && <div className="response-feed-state" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /><p>Loading responses…</p></div>}
      {status === 'error' && <div className="response-feed-state" role="alert"><AlertCircle aria-hidden="true" /><p>{error}</p><button className="button button--soft" type="button" onClick={() => void load()}>Try again</button></div>}
      {status === 'empty' && <div className="response-feed-state"><Sparkles aria-hidden="true" /><strong>No responses yet</strong><p>Be the first person to take this Ralli somewhere new.</p></div>}
      {status === 'success' && locked && <div className="response-lock"><div className="response-lock__previews" aria-hidden="true">{orderedResponses.slice(0, 3).map((response) => <span key={response.id}>{response.mediaUrl && response.format === 'photo' ? <img src={response.mediaUrl} alt="" loading="lazy" decoding="async" /> : <Sparkles />}</span>)}</div><p className="eyebrow">Participation unlocks participation</p><h3>{responses.length} {responses.length === 1 ? 'person has' : 'people have'} already shown up.</h3><p>Add your take to see theirs, react, and challenge someone next.</p>{onJoin && <button className="button button--ink" type="button" onClick={onJoin}>Add yours to unlock <ArrowRight aria-hidden="true" /></button>}</div>}
      {status === 'success' && !locked && <div className="response-list">
        {orderedResponses.map((response) => <article className="response-post" key={response.id}>
          <header><Avatar initials={response.initials} avatarUrl={response.authorAvatarUrl} className="avatar--response avatar--lime" /><div><strong>{response.author}</strong><small>{relativeTime(response.createdAt)} ago</small></div>{user?.id === response.authorId ? <button className="response-more" type="button" aria-label="Delete your response" onClick={() => void removeResponse(response)}><X aria-hidden="true" /></button> : <button className="response-more" type="button" aria-label={`Report or block ${response.author}`} onClick={() => { setReportTarget(response); setReportState('idle') }}><MoreHorizontal aria-hidden="true" /></button>}</header>
          {response.copy && response.mediaUrl && <p className="response-post__copy">{response.copy}</p>}
          {response.mediaUrl && response.format === 'video' && <FeedVideo className="response-post__video" src={response.mediaUrl} poster={response.posterUrl} />}
          {response.mediaUrl && response.format === 'photo' && <img className="response-post__image" src={response.mediaUrl} alt={`${response.author}'s response to ${prompt}`} width="720" height="520" loading="lazy" decoding="async" />}
          {!response.mediaUrl && <div className="text-response"><span>“</span><p>{response.copy}</p></div>}
          <footer>
            <Reactions responseId={response.id} initialCount={response.reactions} initialSelected={response.selectedReaction} />
            <Comments ralliId={ralliId} responseId={response.id} initialCount={response.comments} expanded={commentsOpen === response.id} onToggle={() => setCommentsOpen((current) => current === response.id ? null : response.id)} />
            <TipChip responseId={response.id} recipientAddress={response.authorAddress} author={response.author} initialTotal={response.tips} />
            <button type="button" onClick={() => setPassResponse(response)}><Repeat2 aria-hidden="true" /><span>Pass it on</span></button>
            <button type="button" aria-label="Share response" onClick={() => void navigator.share?.({ title: prompt, url: `${window.location.origin}${window.location.pathname}?ralli=${ralliId}` })}><Share2 aria-hidden="true" /></button>
          </footer>
        </article>)}
      </div>}
      {passResponse && <PassItOn ralliId={ralliId} responseId={passResponse.id} prompt={prompt} responseAuthor={passResponse.author} onClose={() => setPassResponse(null)} />}
      {reportTarget && <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="report-title">
        <section className="payment-panel report-panel" ref={reportDialogRef}>
          <header className="wallet-panel__header"><div><p className="eyebrow">Community safety</p><h2 id="report-title">Report response</h2></div><button className="icon-button" type="button" aria-label="Close report" onClick={closeReport}><X aria-hidden="true" /></button></header>
          {reportState === 'saved' ? <div className="payment-success" aria-live="polite"><Check aria-hidden="true" /><h3>Report received</h3><p>Thanks for helping keep Ralli fun and safe.</p><button className="button button--ink button--wide" type="button" onClick={() => setReportTarget(null)}>Done</button></div> : <form className="payment-form" onSubmit={(event) => { event.preventDefault(); void submitReport() }}>
            <p className="report-copy">Tell us why this response should be reviewed.</p>
            <div className="field"><label htmlFor="report-reason">Reason</label><select id="report-reason" name="reason" value={reportReason} onChange={(event) => setReportReason(event.target.value as typeof reportReason)}><option value="spam">Spam</option><option value="harassment">Harassment or bullying</option><option value="unsafe">Unsafe or harmful content</option><option value="copyright">Copyright concern</option><option value="other">Something else</option></select></div>
            {reportState === 'error' && <p className="payment-error" role="alert">The report could not be sent. Check your connection and try again.</p>}
            {!user && <p className="payment-error" role="alert">Connect your wallet before reporting a response.</p>}
            <button className="button button--ink button--wide" type="submit" disabled={!user || reportState === 'saving'} aria-busy={reportState === 'saving'}><Flag aria-hidden="true" />{reportState === 'saving' ? 'Sending report…' : 'Send report'}</button>
            <button className="button button--soft button--wide" type="button" disabled={!user} onClick={() => void blockAuthor()}>Block {reportTarget.author}</button>
          </form>}
        </section>
      </div>}
    </section>
  )
}
