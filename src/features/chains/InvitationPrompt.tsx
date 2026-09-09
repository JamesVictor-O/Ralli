import { useState } from 'react'
import { ArrowRight, LoaderCircle, X, Zap } from 'lucide-react'
import { acceptInvitation, type InvitationPreview } from '../../lib/invitations.ts'
import { useBackend } from '../../store/backend.ts'
import { actionableError } from '../../lib/errors.ts'

export function InvitationPrompt({ invitation, token, onAccept, onClose }: { invitation: InvitationPreview; token: string; onAccept: () => void; onClose: () => void }) {
  const { status, user, retry } = useBackend()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  async function accept() {
    if (!user) { if (status === 'error') await retry(); return }
    setSaving(true); setError('')
    try { await acceptInvitation(token); onAccept() }
    catch (failure) { setError(actionableError(failure, 'This invitation could not be accepted. Try again.')) }
    finally { setSaving(false) }
  }
  return <div className="wallet-backdrop" role="dialog" aria-modal="true" aria-labelledby="invitation-title"><section className="payment-panel invitation-panel">
    <header className="wallet-panel__header"><p className="eyebrow">Passed to you</p><button className="icon-button" type="button" aria-label="Close invitation" onClick={onClose}><X aria-hidden="true" /></button></header>
    <div className="invitation-hero"><span><Zap aria-hidden="true" /></span><p><strong>{invitation.sender_name}</strong> challenged you</p><h2 id="invitation-title">{invitation.prompt}</h2></div>
    {error && <p className="payment-error" role="alert">{error}</p>}
    <button className="button button--ink button--wide" type="button" disabled={saving || status === 'initializing'} aria-busy={saving} onClick={() => void accept()}>{saving || status === 'initializing' ? <LoaderCircle className="spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}{status === 'initializing' ? 'Getting Ralli ready…' : 'Accept & respond'}</button>
    <button className="button button--soft button--wide" type="button" onClick={onClose}>Maybe later</button>
  </section></div>
}
