import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, LoaderCircle, Send, Share2, X } from 'lucide-react'
import { recordPass } from '../../lib/responses.ts'
import { ensureWalletAttached } from '../../lib/social.ts'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { actionableError } from '../../lib/errors.ts'

interface PassItOnProps {
  ralliId: string
  responseId: string | null
  prompt: string
  responseAuthor: string
  onClose: () => void
}

export function PassItOn({ ralliId, responseId, prompt, responseAuthor, onClose }: PassItOnProps) {
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [shareCompleted, setShareCompleted] = useState(false)
  const { user } = useBackend()
  const { account } = useWallet()
  const ralliUrl = `${window.location.origin}${window.location.pathname}?ralli=${ralliId}`
  const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share

  useBodyScrollLock()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  async function copyLink() {
    await navigator.clipboard.writeText(ralliUrl)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  async function shareRalli() {
    if (!user) return setError('Ralli is still connecting. Try again in a moment.')
    setSaving(true)
    setError('')
    let didShare = shareCompleted
    try {
      await ensureWalletAttached(user.id, account)
      if (!shareCompleted) {
        if (nativeShare) await nativeShare.call(navigator, { title: 'Join this Ralli', text: `${responseAuthor} joined “${prompt}”`, url: ralliUrl })
        else await copyLink()
        setShareCompleted(true)
        didShare = true
      }
      await recordPass(ralliId, responseId, user.id)
      setShared(true)
    } catch (failure) {
      if (failure instanceof Error && failure.name === 'AbortError') return
      setError(didShare
        ? 'Your invite was shared, but its chain link was not recorded. Retry to record it without sharing again.'
        : actionableError(failure, 'This Ralli could not be passed on. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return createPortal(
    <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="pass-title">
      <section className="pass-panel">
        <header className="wallet-panel__header"><div><p className="eyebrow">Keep it moving</p><h2 id="pass-title">Pass this Ralli on</h2></div><button className="icon-button" type="button" aria-label="Close Pass It On" disabled={saving} onClick={onClose}><X aria-hidden="true" /></button></header>
        {shared ? <div className="pass-success" aria-live="polite"><span><Check aria-hidden="true" /></span><h3>It’s moving</h3><p>Your pass is recorded. Anyone opening this link can join the same Ralli.</p><button className="button button--ink button--wide" type="button" onClick={onClose}>Done</button></div> : <>
          <div className="pass-context"><span className="avatar avatar--response avatar--lime">{responseAuthor.slice(0, 1)}</span><div><small>Passing on after {responseAuthor}’s response</small><strong>{prompt}</strong></div></div>
          <div className="pass-link"><div><small>Shareable Ralli link</small><code>{ralliUrl.replace(/^https?:\/\//, '')}</code></div><button type="button" aria-label={copied ? 'Ralli link copied' : 'Copy Ralli link'} onClick={() => void copyLink()}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}</button></div>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <button className="button button--ink button--wide pass-share" type="button" disabled={saving} aria-busy={saving} onClick={() => void shareRalli()}>
            {saving ? <LoaderCircle className="spin" aria-hidden="true" /> : nativeShare ? <Share2 aria-hidden="true" /> : <Send aria-hidden="true" />}
            {saving ? 'Recording pass…' : shareCompleted ? 'Retry chain recording' : nativeShare ? 'Open share sheet' : 'Copy and record pass'}
          </button>
        </>}
      </section>
    </div>, document.body,
  )
}
