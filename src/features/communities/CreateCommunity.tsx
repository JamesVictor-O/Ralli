import { type FormEvent, useCallback, useRef, useState } from 'react'
import { ArrowLeft, LoaderCircle, UsersRound, X } from 'lucide-react'
import { createCommunity } from '../../lib/communities.ts'
import { actionableError } from '../../lib/errors.ts'
import { trackProductEvent } from '../../lib/analytics.ts'
import { useBackend } from '../../store/backend.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { useDialogFocus } from '../../hooks/useDialogFocus.ts'

export function CreateCommunity({ onClose, onCreated }: { onClose: () => void; onCreated: (slug: string) => void }) {
  const [name, setName] = useState('')
  const [icon, setIcon] = useState('🎉')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const panelRef = useRef<HTMLElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useBackend()
  const close = useCallback(() => onClose(), [onClose])

  useBodyScrollLock()
  useDialogFocus(panelRef, true, close)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (name.trim().length < 2) {
      setError('Give your community a name with at least 2 characters.')
      nameRef.current?.focus()
      return
    }
    if (description.trim().length < 10) {
      setError('Describe what people will do together in at least 10 characters.')
      descriptionRef.current?.focus()
      return
    }
    if (!user) {
      setError('Ralli is still connecting your profile. Try again in a moment.')
      return
    }
    setSubmitting(true)
    setError('')
    try {
      const community = await createCommunity({ name, icon, description })
      trackProductEvent('community_created', { userId: user.id, communityId: community.id, source: 'community_hub' })
      onCreated(community.slug)
    } catch (failure) {
      setError(actionableError(failure, 'Your community could not be created. Your details are still here—try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flow-backdrop community-create-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
      <section className="flow-sheet community-create-sheet" ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="create-community-title">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={close}><ArrowLeft aria-hidden="true" /><span>Communities</span></button>
          <button className="icon-button" type="button" aria-label="Close community creator" onClick={close}><X aria-hidden="true" /></button>
        </header>
        <div className="flow-intro">
          <p className="eyebrow">Bring your people together</p>
          <h1 id="create-community-title">Create a community</h1>
          <p>Make a place where people who love the same thing keep showing up and doing it together.</p>
        </div>
        <form className="create-form" onSubmit={submit} noValidate>
          <div className="community-identity-fields">
            <div className="field community-icon-field">
              <label htmlFor="community-icon">Icon</label>
              <input id="community-icon" value={icon} maxLength={16} autoComplete="off" aria-label="Community emoji icon" onChange={(event) => setIcon(event.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="community-name">Community name <span>Required</span></label>
              <input ref={nameRef} id="community-name" value={name} maxLength={40} autoComplete="off" spellCheck={false} placeholder="Basketball" aria-invalid={Boolean(error) && name.trim().length < 2 ? 'true' : undefined} aria-describedby="community-name-hint" onChange={(event) => { setName(event.target.value); setError('') }} />
              <small id="community-name-hint">{name.length}/40</small>
            </div>
          </div>
          <div className="field">
            <label htmlFor="community-description">What will people do here? <span>Required</span></label>
            <textarea ref={descriptionRef} id="community-description" value={description} rows={4} maxLength={180} placeholder="Practice skills, share progress, and keep one another showing up." aria-invalid={Boolean(error) && description.trim().length < 10 ? 'true' : undefined} aria-describedby="community-description-hint" onChange={(event) => { setDescription(event.target.value); setError('') }} />
            <div className="field-meta"><small id="community-description-hint">Keep it active and specific—not a discussion topic.</small><small>{description.length}/180</small></div>
          </div>
          <aside className="community-create-preview" aria-label="Community preview"><span aria-hidden="true">{icon.trim() || '🎉'}</span><div><small>Your community</small><strong>{name.trim() || 'Community name'}</strong><p>{description.trim() || 'What will people come back to do together?'}</p></div><UsersRound aria-hidden="true" /></aside>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <footer className="flow-actions flow-actions--static"><p>You’ll become the owner and first member.</p><button className="button button--ink button--wide" type="submit" disabled={submitting || !user} aria-busy={submitting}>{submitting && <LoaderCircle className="spin" aria-hidden="true" />}{submitting ? 'Creating community…' : 'Create community'}</button></footer>
        </form>
      </section>
    </div>
  )
}
