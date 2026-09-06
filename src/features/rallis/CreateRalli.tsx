import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock3, Globe2, Image, LoaderCircle, Lock, UsersRound, X, Zap } from 'lucide-react'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { createRalli, ensureVerifiedProfile } from '../../lib/social.ts'
import { optimizeCoverImage, validateMedia } from '../../lib/media.ts'
import { nimToLuna, sendNimPayment } from '../../nimiq/payments.ts'
import { recordPaymentSubmission } from '../../lib/payments.ts'

export function CreateRalli({ onClose, onCreated }: { onClose: () => void; onCreated?: (id: string) => void }) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [prompt, setPrompt] = useState('')
  const [reward, setReward] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public')
  const [error, setError] = useState('')
  const [cover, setCover] = useState<File | null>(null)
  const [coverName, setCoverName] = useState('')
  const [coverPreparing, setCoverPreparing] = useState(false)
  const [coverSavings, setCoverSavings] = useState('')
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [duration, setDuration] = useState('24')
  const [submitting, setSubmitting] = useState(false)
  const [publishStage, setPublishStage] = useState<'wallet' | 'prepare' | 'cover' | 'publish'>('wallet')
  const [createdId, setCreatedId] = useState<string | null>(null)
  const [fundingWarning, setFundingWarning] = useState('')
  const [fundingState, setFundingState] = useState<'idle' | 'submitting' | 'funded'>('idle')
  const promptRef = useRef<HTMLTextAreaElement>(null)
  const coverRef = useRef<HTMLInputElement>(null)
  const coverOptimizationRef = useRef<Promise<File> | null>(null)
  const coverSelectionRef = useRef(0)
  const { status: backendStatus, user, error: backendError, retry: retryBackend } = useBackend()
  const { account } = useWallet()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  useEffect(() => () => {
    if (coverPreview) URL.revokeObjectURL(coverPreview)
  }, [coverPreview])

  function chooseCover(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      validateMedia(file, 'cover')
      const selection = coverSelectionRef.current + 1
      coverSelectionRef.current = selection
      if (coverPreview) URL.revokeObjectURL(coverPreview)
      setCover(file)
      setCoverName(file.name)
      setCoverPreview(URL.createObjectURL(file))
      setCoverSavings('')
      setCoverPreparing(true)
      setError('')
      const optimization = optimizeCoverImage(file)
      coverOptimizationRef.current = optimization
      void optimization.then((optimized) => {
        if (coverSelectionRef.current !== selection) return
        setCover(optimized)
        if (optimized.size < file.size) {
          const reduction = Math.round((1 - optimized.size / file.size) * 100)
          setCoverSavings(`${reduction}% smaller for a faster upload`)
        }
      }).catch(() => {
        if (coverSelectionRef.current === selection) setCover(file)
      }).finally(() => {
        if (coverSelectionRef.current === selection) setCoverPreparing(false)
      })
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'That cover could not be used.')
      event.target.value = ''
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (prompt.trim().length < 10) {
      setError('Give people a little more to work with—use at least 10 characters.')
      promptRef.current?.focus()
      return
    }
    if (backendStatus !== 'ready' || !user) {
      if (backendStatus === 'demo') setError('Supabase is not configured in this deployment. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, then redeploy Ralli.')
      else if (backendStatus === 'error') setError(backendError || 'Ralli could not start its Supabase session.')
      else setError('Ralli is finishing its Supabase connection. Wait a moment, then try again.')
      return
    }
    setError('')
    setSubmitting(true)
    setPublishStage('wallet')
    try {
      await ensureVerifiedProfile(user.id, account)
      if (coverOptimizationRef.current && coverPreparing) setPublishStage('prepare')
      const preparedCover = coverOptimizationRef.current ? await coverOptimizationRef.current.catch(() => cover) : cover
      const id = await createRalli({
        userId: user.id,
        prompt,
        visibility,
        durationHours: Number(duration),
        cover: preparedCover,
        onStage: setPublishStage,
      })
      setCreatedId(id)
      onCreated?.(id)
      setStep('success')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your Ralli could not be created.')
    } finally {
      setSubmitting(false)
    }
  }

  async function fundCreatedRalli() {
    if (!createdId || !reward || Number(reward) <= 0) return
    setFundingWarning('')
    setFundingState('submitting')
    try {
      const recipient = import.meta.env.VITE_RALLI_REWARD_ADDRESS as string | undefined
      const transactionHash = await sendNimPayment({ recipient: recipient ?? '', amountNim: reward, message: `Ralli reward: ${createdId}` })
      await recordPaymentSubmission({ kind: 'creator_reward', ralliId: createdId, amountLuna: nimToLuna(reward), transactionHash })
      setFundingState('funded')
    } catch (fundingFailure) {
      setFundingWarning(fundingFailure instanceof Error ? fundingFailure.message : 'The Ralli is live, but its reward was not attached.')
      setFundingState('idle')
    }
  }

  async function shareCreatedRalli() {
    if (!createdId) return
    const url = `${window.location.origin}${window.location.pathname}?ralli=${createdId}`
    if (navigator.share) await navigator.share({ title: prompt, text: 'Join my Ralli', url }).catch(() => undefined)
    else await navigator.clipboard.writeText(url)
  }

  if (step === 'success') {
    return (
      <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="created-title">
        <section className="flow-sheet success-view">
          <span className="success-burst success-burst--violet" aria-hidden="true"><Check /></span>
          <p className="eyebrow">Your Ralli is live</p>
          <h1 id="created-title">Now pass it on.</h1>
          <p>{fundingState === 'funded' ? `${reward} NIM was submitted to the reward pool.` : 'Invite someone first or let the community discover it naturally.'}</p>
          {fundingWarning && <p className="payment-error" role="alert"><strong>Reward needs attention.</strong> {fundingWarning}</p>}
          <div className="success-actions">
            {reward && Number(reward) > 0 && fundingState !== 'funded' && (
              <button className="button button--soft button--wide" type="button" disabled={fundingState === 'submitting'}
                aria-busy={fundingState === 'submitting'} onClick={() => void fundCreatedRalli()}>
                {fundingState === 'submitting' && <LoaderCircle className="spin" aria-hidden="true" />}
                {fundingState === 'submitting' ? 'Waiting for approval…' : `Fund with ${reward} NIM`}
              </button>
            )}
            <button className="button button--ink button--wide" type="button" onClick={() => void shareCreatedRalli()}>Invite friends</button>
            <button className="button button--soft button--wide" type="button" onClick={onClose}>Back to Discover</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="create-title">
      <section className="flow-sheet">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /><span>Discover</span></button>
          <button className="icon-button" type="button" aria-label="Close Ralli creator" onClick={onClose}><X aria-hidden="true" /></button>
        </header>
        <div className="flow-intro">
          <p className="eyebrow">Start something</p>
          <h1 id="create-title">Create a Ralli</h1>
          <p>Give people one simple, irresistible thing to do.</p>
        </div>
        <form className="create-form" onSubmit={submit} noValidate>
          <div className="field">
            <label htmlFor="ralli-prompt">The challenge <span>Required</span></label>
            <textarea ref={promptRef} id="ralli-prompt" rows={4} maxLength={140}
              placeholder="Show us the best view from your city."
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'ralli-prompt-error' : 'ralli-prompt-hint'}
              value={prompt} onChange={(event) => setPrompt(event.target.value)} />
            <div className="field-meta">
              <small id={error ? 'ralli-prompt-error' : 'ralli-prompt-hint'} className={error ? 'field-error' : ''}>
                {error || 'Make it clear enough to understand in one glance.'}
              </small>
              <small>{prompt.length}/140</small>
            </div>
          </div>

          <input className="sr-only" ref={coverRef} id="ralli-cover" type="file" accept="image/jpeg,image/png,image/webp"
            onChange={chooseCover} />
          <button className={`media-drop ${coverPreview ? 'has-preview' : ''}`} type="button" onClick={() => coverRef.current?.click()}>
            {coverPreview ? <img src={coverPreview} alt="Selected Ralli cover preview" /> : <span><Image aria-hidden="true" /></span>}
            <div><strong>{coverName || 'Add a cover'}</strong><small>{coverPreparing ? 'Preparing a faster upload…' : coverSavings || 'JPG, PNG or WebP · Up to 10 MB'}</small></div>
            <span>{cover ? 'Change' : 'Choose'}</span>
          </button>

          <fieldset className="choice-group">
            <legend>Who can join?</legend>
            <label className={visibility === 'public' ? 'is-selected' : ''}>
              <input type="radio" name="visibility" value="public" checked={visibility === 'public'} onChange={() => setVisibility('public')} />
              <span className="choice-icon"><Globe2 aria-hidden="true" /></span>
              <span><strong>Everyone</strong><small>Anyone in the community can join.</small></span>
              <span className="radio-dot" />
            </label>
            <label className={visibility === 'friends' ? 'is-selected' : ''}>
              <input type="radio" name="visibility" value="friends" checked={visibility === 'friends'} onChange={() => setVisibility('friends')} />
              <span className="choice-icon"><UsersRound aria-hidden="true" /></span>
              <span><strong>Invited people</strong><small>Only people with your link can join.</small></span>
              <span className="radio-dot" />
            </label>
          </fieldset>

          <div className="form-grid">
            <div className="field">
              <label htmlFor="duration">Duration</label>
              <div className="input-with-icon"><Clock3 aria-hidden="true" /><select id="duration" value={duration} onChange={(event) => setDuration(event.target.value)}><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></div>
            </div>
            <div className="field">
              <label htmlFor="reward">Reward <span>Optional</span></label>
              <div className="input-with-icon"><Zap aria-hidden="true" /><input id="reward" type="text" inputMode="decimal" autoComplete="off" placeholder="0" value={reward} onChange={(event) => setReward(event.target.value.replace(/[^0-9.]/g, ''))} /><strong>NIM</strong></div>
            </div>
          </div>

          {reward && Number(reward) > 0 && (
            <div className="wallet-note">
              <Lock aria-hidden="true" />
              <p><strong>You’ll approve this separately.</strong><span>Nimiq Pay will ask you to confirm the {reward} NIM reward after the Ralli is created.</span></p>
            </div>
          )}

          <footer className="flow-actions flow-actions--static">
            <p>You can edit the description after publishing.</p>
            {backendStatus === 'error' && <button className="text-button" type="button" onClick={() => void retryBackend()}>Retry Supabase connection</button>}
            <button className="button button--ink button--wide" type="submit" disabled={submitting} aria-busy={submitting}>
              {submitting && <LoaderCircle className="spin" aria-hidden="true" />}
              {submitting ? publishStage === 'wallet' ? 'Checking wallet…' : publishStage === 'prepare' ? 'Optimizing cover…' : publishStage === 'cover' ? 'Uploading cover…' : 'Publishing Ralli…' : 'Start this Ralli'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
