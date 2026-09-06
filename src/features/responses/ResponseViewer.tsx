import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertCircle, HandCoins, LoaderCircle, MoreHorizontal, Repeat2, Share2, Sparkles } from 'lucide-react'
import { Reactions } from './Reactions.tsx'
import { PassItOn } from '../chains/PassItOn.tsx'
import { Tip } from '../rewards/Tip.tsx'
import { fetchResponses, type RalliResponse } from '../../lib/responses.ts'
import { useBackend } from '../../store/backend.ts'

type Sort = 'Popular' | 'Newest'

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export function ResponseViewer({ ralliId, prompt }: { ralliId: string; prompt: string }) {
  const [sort, setSort] = useState<Sort>('Popular')
  const [passResponse, setPassResponse] = useState<RalliResponse | null>(null)
  const [tipResponse, setTipResponse] = useState<RalliResponse | null>(null)
  const [responses, setResponses] = useState<RalliResponse[]>([])
  const [status, setStatus] = useState<'loading' | 'success' | 'empty' | 'error'>('loading')
  const [error, setError] = useState('')
  const { user } = useBackend()

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

  const orderedResponses = useMemo(() => [...responses].sort((left, right) => sort === 'Popular'
    ? right.reactions - left.reactions
    : new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()), [responses, sort])

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
      {status === 'success' && <div className="response-list">
        {orderedResponses.map((response) => <article className="response-post" key={response.id}>
          <header><span className="avatar avatar--response avatar--lime">{response.initials}</span><div><strong>{response.author}</strong><small>{relativeTime(response.createdAt)} ago</small></div><button className="response-more" type="button" aria-label={`More options for ${response.author}'s response`}><MoreHorizontal aria-hidden="true" /></button></header>
          {response.copy && response.mediaUrl && <p className="response-post__copy">{response.copy}</p>}
          {response.mediaUrl && response.format === 'video' && <video className="response-post__image" src={response.mediaUrl} controls preload="metadata" />}
          {response.mediaUrl && response.format === 'photo' && <img className="response-post__image" src={response.mediaUrl} alt={`${response.author}'s response to ${prompt}`} width="720" height="520" />}
          {!response.mediaUrl && <div className="text-response"><span>“</span><p>{response.copy}</p></div>}
          <footer>
            <Reactions responseId={response.id} initialCount={response.reactions} initialSelected={response.selectedReaction} />
            <button className="tip-response" type="button" onClick={() => setTipResponse(response)}><HandCoins aria-hidden="true" /><span>Tip</span><strong>{response.tips} NIM</strong></button>
            <button type="button" onClick={() => setPassResponse(response)}><Repeat2 aria-hidden="true" /><span>Pass it on</span></button>
            <button type="button" aria-label="Share response" onClick={() => void navigator.share?.({ title: prompt, url: `${window.location.origin}${window.location.pathname}?ralli=${ralliId}` })}><Share2 aria-hidden="true" /></button>
          </footer>
        </article>)}
      </div>}
      {passResponse && <PassItOn ralliId={ralliId} responseId={passResponse.id} prompt={prompt} responseAuthor={passResponse.author} onClose={() => setPassResponse(null)} />}
      {tipResponse && <Tip responseId={tipResponse.id} recipientAddress={tipResponse.authorAddress} author={tipResponse.author} onClose={() => setTipResponse(null)} />}
    </section>
  )
}
