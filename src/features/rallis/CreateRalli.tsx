import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, Check, Clock3, Globe2, Image, Lock, UsersRound, X, Zap } from 'lucide-react'

export function CreateRalli({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState<'form' | 'success'>('form')
  const [prompt, setPrompt] = useState('')
  const [reward, setReward] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'friends'>('public')
  const [error, setError] = useState('')
  const promptRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (prompt.trim().length < 10) {
      setError('Give people a little more to work with—use at least 10 characters.')
      promptRef.current?.focus()
      return
    }
    setError('')
    setStep('success')
  }

  if (step === 'success') {
    return (
      <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="created-title">
        <section className="flow-sheet success-view">
          <span className="success-burst success-burst--violet" aria-hidden="true"><Check /></span>
          <p className="eyebrow">Your Ralli is live</p>
          <h1 id="created-title">Now pass it on.</h1>
          <p>Invite someone first or let the community discover it naturally.</p>
          <div className="success-actions">
            <button className="button button--ink button--wide" type="button">Invite friends</button>
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

          <button className="media-drop" type="button">
            <span><Image aria-hidden="true" /></span>
            <div><strong>Add a cover</strong><small>Photo or video · Optional</small></div>
            <span>Choose</span>
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
              <div className="input-with-icon"><Clock3 aria-hidden="true" /><select id="duration" defaultValue="24"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option></select></div>
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
            <button className="button button--ink button--wide" type="submit">Start this Ralli</button>
          </footer>
        </form>
      </section>
    </div>
  )
}
