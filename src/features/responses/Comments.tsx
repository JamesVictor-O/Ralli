import { type FormEvent, useCallback, useState } from 'react'
import { AlertCircle, LoaderCircle, MessageCircle, Send } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { createComment, fetchComments, type RalliComment } from '../../lib/comments.ts'
import { actionableError } from '../../lib/errors.ts'
import { useBackend } from '../../store/backend.ts'

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m`
  if (minutes < 1_440) return `${Math.floor(minutes / 60)}h`
  return `${Math.floor(minutes / 1_440)}d`
}

export function Comments({ ralliId, responseId, initialCount = 0, expanded, onToggle }: { ralliId: string; responseId?: string; initialCount?: number; expanded: boolean; onToggle: () => void }) {
  const [comments, setComments] = useState<RalliComment[]>([])
  const [count, setCount] = useState(initialCount)
  const [body, setBody] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const { user } = useBackend()

  const load = useCallback(async () => {
    setStatus('loading')
    try { const rows = await fetchComments(ralliId, responseId); setComments(rows); setCount(rows.length); setStatus('ready') }
    catch (failure) { setError(actionableError(failure, 'Comments could not be loaded. Try again.')); setStatus('error') }
  }, [ralliId, responseId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!body.trim() || posting) return
    if (!user) return setError('Ralli is still connecting. Try again in a moment.')
    setPosting(true); setError('')
    try {
      await createComment({ ralliId, responseId, authorId: user.id, body })
      setBody('')
      await load()
    } catch (failure) { setError(actionableError(failure, 'Your comment could not be posted. Try again.')) }
    finally { setPosting(false) }
  }

  return <>
    <button className="response-action" type="button" aria-expanded={expanded} onClick={() => { if (!expanded && status === 'idle') void load(); onToggle() }}><MessageCircle aria-hidden="true" /><span>Comment</span>{count > 0 && <small>{count}</small>}</button>
    {expanded && <section className="comment-thread" aria-label={responseId ? 'Response comments' : 'Ralli comments'}>
      {status === 'loading' && <div className="comment-state" role="status"><LoaderCircle className="spin" aria-hidden="true" /> Loading comments…</div>}
      {status === 'error' && <div className="comment-state" role="alert"><AlertCircle aria-hidden="true" /> {error}<button type="button" onClick={() => void load()}>Try again</button></div>}
      {status === 'ready' && comments.length === 0 && <div className="comment-empty"><MessageCircle aria-hidden="true" /><span><strong>Start the conversation</strong><small>Say something about this {responseId ? 'response' : 'Ralli'}.</small></span></div>}
      {status === 'ready' && comments.length > 0 && <div className="comment-list">{comments.map((comment) => <article key={comment.id}><Avatar initials={comment.initials} avatarUrl={comment.avatarUrl} /><div><p><strong>{comment.author}</strong><time dateTime={comment.createdAt}>{relativeTime(comment.createdAt)}</time></p><span>{comment.body}</span></div></article>)}</div>}
      <form className="comment-form" onSubmit={submit}><label className="sr-only" htmlFor={`comment-${responseId ?? ralliId}`}>Add a comment</label><input id={`comment-${responseId ?? ralliId}`} value={body} maxLength={500} placeholder="Add to the conversation…" onChange={(event) => setBody(event.target.value)} /><button type="submit" disabled={!body.trim() || posting} aria-label="Post comment" aria-busy={posting}>{posting ? <LoaderCircle className="spin" aria-hidden="true" /> : <Send aria-hidden="true" />}</button></form>
      {error && status !== 'error' && <p className="comment-error" role="alert">{error}</p>}
    </section>}
  </>
}
