import { type ChangeEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Camera, Check, Image, LoaderCircle, Type, Video, X } from 'lucide-react'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { createResponse, ensureWalletAttached } from '../../lib/social.ts'
import { createVideoPoster, isImageFile, isVideoFile, optimizeResponseImage, uploadRalliMedia, validateMedia } from '../../lib/media.ts'
import { fetchViewerGeo } from '../../lib/geo.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { actionableError } from '../../lib/errors.ts'
import { trackProductEvent } from '../../lib/analytics.ts'

interface JoinRalliProps {
  ralliId: string
  prompt: string
  onBack: () => void
  onClose: () => void
  onSeeResponses: (responseId: string) => void
  onPosted?: (responseId: string) => void
}

export function JoinRalli({ ralliId, prompt, onBack, onClose, onSeeResponses, onPosted }: JoinRalliProps) {
  const [format, setFormat] = useState<'photo' | 'video' | 'text'>('photo')
  const [caption, setCaption] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [media, setMedia] = useState<File | null>(null)
  const [mediaPreparing, setMediaPreparing] = useState(false)
  const [mediaSavings, setMediaSavings] = useState('')
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitStage, setSubmitStage] = useState<'wallet' | 'prepare' | 'upload' | 'publish'>('wallet')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [responseId, setResponseId] = useState<string | null>(null)
  const cameraRef = useRef<HTMLInputElement>(null)
  const libraryRef = useRef<HTMLInputElement>(null)
  const mediaOptimizationRef = useRef<Promise<File> | null>(null)
  const videoPosterRef = useRef<Promise<File | null> | null>(null)
  const earlyVideoUploadRef = useRef<Promise<{ mediaPath: string; posterPath: string | null } | null> | null>(null)
  const mediaSelectionRef = useRef(0)
  const { status: backendStatus, user, error: backendError } = useBackend()
  const { account } = useWallet()

  useBodyScrollLock()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview) }, [preview])

  useEffect(() => {
    // This request is read-only and optional. Starting it while the response sheet
    // is open removes a network round trip from the eventual publish path.
    void fetchViewerGeo()
  }, [])

  function chooseMedia(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateMedia(file, 'response')
      if (format === 'photo' && !isImageFile(file)) throw new Error('Choose a photo for this response.')
      if (format === 'video' && !isVideoFile(file)) throw new Error('Choose a video for this response.')
      if (preview) URL.revokeObjectURL(preview)
      setMedia(file)
      setPreview(URL.createObjectURL(file))
      setMediaSavings('')
      setUploadProgress(0)
      earlyVideoUploadRef.current = null
      videoPosterRef.current = null
      setError('')
      const selection = mediaSelectionRef.current + 1
      mediaSelectionRef.current = selection
      if (isImageFile(file)) {
        setMediaPreparing(true)
        const optimization = optimizeResponseImage(file)
        mediaOptimizationRef.current = optimization
        void optimization.then((optimized) => {
          if (mediaSelectionRef.current !== selection) return
          setMedia(optimized)
          if (optimized.size < file.size) {
            const reduction = Math.round((1 - optimized.size / file.size) * 100)
            setMediaSavings(`${reduction}% smaller for a faster post`)
          }
        }).catch(() => {
          if (mediaSelectionRef.current === selection) setMedia(file)
        }).finally(() => {
          if (mediaSelectionRef.current === selection) setMediaPreparing(false)
        })
      } else {
        mediaOptimizationRef.current = null
        const posterPromise = createVideoPoster(file)
        videoPosterRef.current = posterPromise
        // Social apps hide upload latency by starting as soon as a clip is selected,
        // while the person is still reviewing it or writing a caption.
        if (user) {
          setMediaPreparing(true)
          const earlyUpload = (async () => {
            const poster = await posterPromise.catch(() => null)
            const [mediaPath, posterPath] = await Promise.all([
              uploadRalliMedia(user.id, 'responses', file, setUploadProgress),
              poster ? uploadRalliMedia(user.id, 'responses', poster) : Promise.resolve(null),
            ])
            return { mediaPath, posterPath }
          })().catch(() => null).finally(() => {
            if (mediaSelectionRef.current === selection) setMediaPreparing(false)
          })
          earlyVideoUploadRef.current = earlyUpload
        } else {
          setMediaPreparing(false)
        }
      }
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
    setUploadProgress(0)
    setSubmitStage('wallet')
    try {
      await ensureWalletAttached(user.id, account)
      if (mediaOptimizationRef.current && mediaPreparing) setSubmitStage('prepare')
      const preparedMedia = mediaOptimizationRef.current ? await mediaOptimizationRef.current.catch(() => media) : media
      const poster = videoPosterRef.current ? await videoPosterRef.current.catch(() => null) : null
      if (earlyVideoUploadRef.current) setSubmitStage('upload')
      const earlyUpload = earlyVideoUploadRef.current ? await earlyVideoUploadRef.current : null
      const createdResponseId = await createResponse({ userId: user.id, ralliId, format, text: caption, media: earlyUpload ? null : preparedMedia, poster: earlyUpload ? null : poster, uploadedMediaPath: earlyUpload?.mediaPath, uploadedPosterPath: earlyUpload?.posterPath, onStage: setSubmitStage, onUploadProgress: setUploadProgress })
      trackProductEvent('response_published', { userId: user.id, ralliId, responseId: createdResponseId, source: 'response_flow', properties: { format } })
      setResponseId(createdResponseId)
      setSubmitted(true)
      onPosted?.(createdResponseId)
      window.setTimeout(() => onSeeResponses(createdResponseId), 900)
    } catch (failure) {
      const message = failure instanceof Error ? failure.message : 'Your response could not be posted.'
      if (/one_response_per_ralli|duplicate key/i.test(message)) setError('You already responded to this Ralli.')
      else if (/ralli_expired/i.test(message)) setError('This Ralli has ended — it can no longer accept responses.')
      else setError(actionableError(failure, 'Your response could not be posted. Try again.'))
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
          <p>You showed up. Unlocking everyone’s responses…</p>
          <div className="success-actions">
            <button className="button button--ink button--wide" type="button" onClick={() => responseId && onSeeResponses(responseId)}>See everyone’s responses</button>
          </div>
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
            <button className={format === value ? 'is-active' : ''} type="button" key={value} onClick={() => { setFormat(value); setMedia(null); setPreview(null); setMediaSavings(''); mediaOptimizationRef.current = null; videoPosterRef.current = null; earlyVideoUploadRef.current = null; setUploadProgress(0); setError('') }}>
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
              <input className="sr-only" ref={cameraRef} type="file" accept={format === 'photo' ? 'image/*' : 'video/*,.mov,.m4v'} capture="environment" onChange={chooseMedia} />
              <input className="sr-only" ref={libraryRef} type="file" accept={format === 'photo' ? 'image/*' : 'video/mp4,video/webm,video/quicktime,video/x-m4v,.mov,.m4v'} onChange={chooseMedia} />
              {preview ? (format === 'photo' ? <img className="capture-preview" src={preview} alt="Response preview" /> : <video className="capture-preview" src={preview} controls />) : <span className="capture-icon">{format === 'photo' ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}</span>}
              <div><strong>{format === 'photo' ? 'Take a photo' : 'Record a video'}</strong><p>Use your camera or choose something you already captured.</p></div>
              {media && <p className="capture-preparation" role="status">{mediaPreparing ? format === 'video' && uploadProgress ? `Uploading in the background · ${uploadProgress}%` : 'Preparing a faster upload…' : mediaSavings || (format === 'video' ? 'Video ready to post' : 'Photo ready to post')}</p>}
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
            {submitting && <LoaderCircle className="spin" aria-hidden="true" />}{submitting ? submitStage === 'wallet' ? 'Checking wallet…' : submitStage === 'prepare' ? 'Preparing photo…' : submitStage === 'upload' ? `Uploading response${uploadProgress ? ` · ${uploadProgress}%` : '…'}` : 'Publishing response…' : error ? 'Try posting again' : 'Post response'}
          </button>
        </footer>
      </section>
    </div>
  )
}
