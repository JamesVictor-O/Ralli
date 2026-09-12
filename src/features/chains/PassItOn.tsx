import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, LoaderCircle, Send, Share2, X } from 'lucide-react'
import { recordPass } from '../../lib/responses.ts'
import { ensureWalletAttached } from '../../lib/social.ts'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { actionableError } from '../../lib/errors.ts'
import { trackProductEvent } from '../../lib/analytics.ts'

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
  const [inviteToken, setInviteToken] = useState<string | null>(null)
  const analyticsTracked = useRef(false)
  const { user } = useBackend()
  const { account } = useWallet()
  const baseUrl = `${window.location.origin}${window.location.pathname}?ralli=${ralliId}`
  const ralliUrl = inviteToken ? `${baseUrl}&invite=${inviteToken}` : baseUrl
  const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share

  useBodyScrollLock()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && !saving && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, saving])

  async function copyLink() {
    if (!user) return setError('Ralli is still connecting. Try again in a moment.')
    try {
      await ensureWalletAttached(user.id, account)
      const token = inviteToken ?? await recordPass(ralliId, responseId, user.id)
      if (!inviteToken) {
        setInviteToken(token)
        trackProductEvent('invitation_shared', { userId: user.id, ralliId, responseId: responseId ?? undefined, source: 'copy_link' })
        analyticsTracked.current = true
      }
      await navigator.clipboard.writeText(`${baseUrl}&invite=${token}`)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch (failure) { setError(actionableError(failure, 'The invitation link could not be copied. Try again.')) }
  }

  async function shareRalli() {
    if (!user) return setError('Ralli is still connecting. Try again in a moment.')
    setSaving(true)
    setError('')
    let didShare = shareCompleted
    try {
      await ensureWalletAttached(user.id, account)
      const token = inviteToken ?? await recordPass(ralliId, responseId, user.id)
      const createdInvitation = !inviteToken
      if (createdInvitation) setInviteToken(token)
      const invitationUrl = `${baseUrl}&invite=${token}`
      if (!shareCompleted) {
        if (nativeShare) await nativeShare.call(navigator, { title: 'Join this Ralli', text: `${responseAuthor} challenged you: “${prompt}”`, url: invitationUrl })
        else { await navigator.clipboard.writeText(invitationUrl); setCopied(true) }
        if (!analyticsTracked.current) {
          trackProductEvent('invitation_shared', { userId: user.id, ralliId, responseId: responseId ?? undefined, source: nativeShare ? 'native_share' : 'copy_link' })
          analyticsTracked.current = true
        }
        setShareCompleted(true)
        didShare = true
      }
      setShared(true)
    } catch (failure) {
      if (failure instanceof Error && failure.name === 'AbortError') return
      setError(didShare
        ? 'Your invitation was created but sharing did not finish. Try sharing the same invitation again.'
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
