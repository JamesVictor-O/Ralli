import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Check, Image, LoaderCircle, Type, Video, X } from 'lucide-react'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { createResponse, ensureWalletAttached } from '../../lib/social.ts'
import { validateMedia } from '../../lib/media.ts'

interface JoinRalliProps {
  ralliId: string
  prompt: string
  onBack: () => void
  onClose: () => void
  onPosted?: () => void
}

export function JoinRalli({ ralliId, prompt, onBack, onClose, onPosted }: JoinRalliProps) {
  const [format, setFormat] = useState<'photo' | 'video' | 'text'>('photo')
  const [caption, setCaption] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [media, setMedia] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const { status: backendStatus, user, error: backendError } = useBackend()
  const { account } = useWallet()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  function chooseMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateMedia(file, 'response')
      if (format === 'photo' && !file.type.startsWith('image/')) throw new Error('Choose a photo for this response.')
      if (format === 'video' && !file.type.startsWith('video/')) throw new Error('Choose a video for this response.')
      if (preview) URL.revokeObjectURL(preview)
      setMedia(file)
      setPreview(URL.createObjectURL(file))
      setError('')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That media could not be used.')
      event.target.value = ''
    }
  }

  async function submitResponse() {
    if (backendStatus !== 'ready' || !user) {
      if (backendStatus === 'demo') return setError('Supabase is not configured in this deployment. Add its VITE environment variables and redeploy.')
      if (backendStatus === 'error') return setError(backendError || 'Ralli could not start its Supabase session.')
      return setError('Ralli is finishing its Supabase connection. Wait a moment, then try again.')
    }
    if (format === 'text' && !caption.trim()) return setError('Write your response before posting.')
    if (format !== 'text' && !media) return setError(`Take or choose a ${format} before posting.`)
    setError('')
    setSubmitting(true)
    try {
      await ensureWalletAttached(user.id, account)
      await createResponse({ userId: user.id, ralliId, format, text: caption, media })
      setSubmitted(true)
      onPosted?.()
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Your response could not be posted.'
      setError(/one_response_per_ralli|duplicate key/i.test(message) ? 'You already responded to this Ralli.' : message)
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="joined-title">
        <section className="flow-sheet success-view">
          <span className="success-burst" aria-hidden="true"><Check /></span>
          <p className="eyebrow">You joined the Ralli</p>
          <h1 id="joined-title">That’s in the chain.</h1>
          <p>Your response is ready. Pass it to someone and keep the Ralli moving.</p>
          <button className="button button--ink button--wide" type="button" onClick={onClose}>Back to Discover</button>
        </section>
      </div>
    )
  }

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="join-title">
      <section className="flow-sheet">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onBack}><ArrowLeft aria-hidden="true" /><span>Ralli</span></button>
          <button className="icon-button" type="button" aria-label="Close response capture" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <div className="flow-intro">
          <p className="eyebrow">Your response</p>
          <h1 id="join-title">{prompt}</h1>
          <p>Make it yours. You can review everything before posting.</p>
        </div>
        <fieldset className="format-picker">
          <legend>Response format</legend>
          {[
            { value: 'photo' as const, icon: Camera, label: 'Photo' },
            { value: 'video' as const, icon: Video, label: 'Video' },
            { value: 'text' as const, icon: Type, label: 'Text' },
          ].map(({ value, icon: Icon, label }) => (
            <button className={format === value ? 'is-active' : ''} type="button" key={value} onClick={() => { setFormat(value); setMedia(null); setPreview(null); setError('') }}>
              <Icon aria-hidden="true" /><span>{label}</span>
            </button>
          ))}
        </fieldset>
        <div className="capture-stage">
          {format === 'text' ? (
            <div className="field">
              <label htmlFor="text-response">Your response</label>
              <textarea id="text-response" rows={7} maxLength={280} placeholder="Tell the story…" value={caption} onChange={(event) => setCaption(event.target.value)} />
              <small>{caption.length}/280 characters</small>
            </div>
          ) : (
            <>
              <input className="sr-only" ref={cameraRef} type="file" accept={format === 'photo' ? 'image/*' : 'video/*'} capture="environment" onChange={chooseMedia} />
              <input className="sr-only" ref={libraryRef} type="file" accept={format === 'photo' ? 'image/*' : 'video/*'} onChange={chooseMedia} />
              {preview ? (format === 'photo' ? <img className="capture-preview" src={preview} alt="Response preview" /> : <video className="capture-preview" src={preview} controls />) : <span className="capture-icon">{format === 'photo' ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}</span>}
              <div><strong>{format === 'photo' ? 'Take a photo' : 'Record a video'}</strong><p>Use your camera or choose something you already captured.</p></div>
              <div className="capture-actions">
                <button className="button button--ink" type="button" onClick={() => cameraRef.current?.click()}><Camera aria-hidden="true" />Open camera</button>
                <button className="button button--soft" type="button" onClick={() => libraryRef.current?.click()}><Image aria-hidden="true" />Choose media</button>
              </div>
            </>
          )}
        </div>
        {format !== 'text' && (
          <div className="field">
            <label htmlFor="response-caption">Add a caption <span>Optional</span></label>
            <textarea id="response-caption" rows={3} maxLength={160} placeholder="What are we looking at?" value={caption} onChange={(event) => setCaption(event.target.value)} />
            <small>{caption.length}/160 characters</small>
          </div>
        )}
        {error && <p className="payment-error" role="alert">{error}</p>}
        <footer className="flow-actions flow-actions--static">
          <p>Posting does not trigger a wallet transaction.</p>
          <button className="button button--ink button--wide" type="button" disabled={submitting} aria-busy={submitting} onClick={() => void submitResponse()}>
            {submitting && <LoaderCircle className="spin" aria-hidden="true" />}{submitting ? 'Uploading response…' : 'Post response'}
          </button>
        </footer>
      </section>
    </div>
  )
}
