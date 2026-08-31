import { useEffect, useState } from 'react'
import { ArrowLeft, Camera, Check, Image, Type, Video, X } from 'lucide-react'

export function JoinRalli({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [format, setFormat] = useState<'photo' | 'video' | 'text'>('photo')
  const [caption, setCaption] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

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
          <h1 id="join-title">Show us the weirdest thing on your desk.</h1>
          <p>Make it yours. You can review everything before posting.</p>
        </div>
        <fieldset className="format-picker">
          <legend>Response format</legend>
          {[
            { value: 'photo' as const, icon: Camera, label: 'Photo' },
            { value: 'video' as const, icon: Video, label: 'Video' },
            { value: 'text' as const, icon: Type, label: 'Text' },
          ].map(({ value, icon: Icon, label }) => (
            <button className={format === value ? 'is-active' : ''} type="button" key={value} onClick={() => setFormat(value)}>
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
              <span className="capture-icon">{format === 'photo' ? <Camera aria-hidden="true" /> : <Video aria-hidden="true" />}</span>
              <div><strong>{format === 'photo' ? 'Take a photo' : 'Record a video'}</strong><p>Use your camera or choose something you already captured.</p></div>
              <div className="capture-actions">
                <button className="button button--ink" type="button"><Camera aria-hidden="true" />Open camera</button>
                <button className="button button--soft" type="button"><Image aria-hidden="true" />Choose media</button>
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
        <footer className="flow-actions flow-actions--static">
          <p>Posting does not trigger a wallet transaction.</p>
          <button className="button button--ink button--wide" type="button" onClick={() => setSubmitted(true)}>Post response</button>
        </footer>
      </section>
    </div>
  )
}
