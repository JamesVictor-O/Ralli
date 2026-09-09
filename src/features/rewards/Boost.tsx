import { type FormEvent, useEffect, useState } from 'react'
import { Check, LoaderCircle, ShieldCheck, X, Zap } from 'lucide-react'
import { useWallet } from '../../store/wallet.ts'
import { nimToLuna, sendNimPayment } from '../../nimiq/payments.ts'
import { confirmPayment, recordPaymentSubmission } from '../../lib/payments.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { actionableError } from '../../lib/errors.ts'
import { fetchVerifiedCreatorAddress } from '../../lib/rallis.ts'

const presetAmounts = ['1', '2', '5', '10']

function paymentError(error: unknown) {
  return actionableError(error, 'The boost could not be sent. No NIM was deducted—try again.')
}

interface BoostProps {
  onClose: () => void
  ralliId: string
  creator?: string
  ralli?: string
  pool?: number
}

export function Boost({ onClose, ralliId, creator = 'Ralli creator', ralli = 'this Ralli', pool = 0 }: BoostProps) {
  const { status, connect } = useWallet()
  const [amount, setAmount] = useState('2')
  const [state, setState] = useState<'idle' | 'submitting' | 'confirming' | 'success' | 'sent-unconfirmed'>('idle')
  const [error, setError] = useState('')
  const [recipient, setRecipient] = useState<string | null | undefined>(undefined)

  useBodyScrollLock()
  useEffect(() => { void fetchVerifiedCreatorAddress(ralliId).then(setRecipient).catch(() => setRecipient(null)) }, [ralliId])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && state !== 'submitting' && state !== 'confirming' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, state])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a NIM amount greater than zero.')
      return
    }
    setError('')
    setState('submitting')
    try {
      const transactionHash = await sendNimPayment({ recipient: recipient ?? '', amountNim: amount, message: `Ralli boost: ${ralliId}` })
      await recordPaymentSubmission({ kind: 'boost', ralliId, amountLuna: nimToLuna(amount), transactionHash })
      setState('confirming')
      try {
        await confirmPayment({ kind: 'boost', transactionHash })
        setState('success')
      } catch (confirmFailure) {
        console.error('Boost confirmation failed', confirmFailure)
        setState('sent-unconfirmed')
      }
    } catch (paymentFailure) {
      setError(paymentError(paymentFailure))
      setState('idle')
    }
  }

  return (
    <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="boost-title">
      <section className="payment-panel">
        <header className="wallet-panel__header">
          <div><p className="eyebrow">Add to the reward</p><h2 id="boost-title">Boost this Ralli</h2></div>
          <button className="icon-button" type="button" aria-label="Close Boost" disabled={state === 'submitting' || state === 'confirming'} onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {state === 'confirming' ? (
          <div className="payment-success" aria-live="polite">
            <span><LoaderCircle className="spin" aria-hidden="true" /></span><h3>Confirming on-chain…</h3>
            <p>Your {amount} NIM boost is on its way. This usually takes a few seconds.</p>
          </div>
        ) : state === 'success' ? (
          <div className="payment-success" aria-live="polite">
            <span><Check aria-hidden="true" /></span><h3>Boost confirmed</h3>
            <p>Your {amount} NIM was sent directly to {creator}.</p>
            <button className="button button--ink button--wide" type="button" onClick={onClose}>Done</button>
          </div>
        ) : state === 'sent-unconfirmed' ? (
          <div className="payment-success" aria-live="polite">
            <span><Check aria-hidden="true" /></span><h3>Boost sent</h3>
            <p>Your {amount} NIM transaction is on the network but is taking longer than usual to confirm. It'll count once it settles — no need to send it again.</p>
            <button className="button button--ink button--wide" type="button" onClick={onClose}>Done</button>
          </div>
        ) : status !== 'connected' ? (
          <div className="wallet-state">
            <span className="wallet-state__icon"><ShieldCheck aria-hidden="true" /></span>
            <h3>Connect before boosting</h3>
            <p>Choose your public account first. After connecting, you’ll tap Boost again to approve the payment separately.</p>
            <button className="button button--ink button--wide" type="button" disabled={status === 'connecting'}
              aria-busy={status === 'connecting'} onClick={() => void connect()}>
              {status === 'connecting' ? 'Waiting for approval…' : 'Connect Nimiq account'}
            </button>
          </div>
        ) : recipient === undefined ? (
          <div className="wallet-state" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /><h3>Finding creator wallet…</h3></div>
        ) : !recipient ? (
          <div className="wallet-state" role="alert">
            <span className="wallet-state__icon wallet-state__icon--coral"><Zap aria-hidden="true" /></span>
            <h3>Boosts need a recipient</h3>
            <p>{creator} needs to verify a Nimiq address before receiving direct boosts.</p>
            <button className="button button--soft" type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="payment-form" onSubmit={submit}>
            <div className="payment-recipient">
              <span className="avatar avatar--author avatar--coral">{creator.slice(0, 2).toUpperCase()}</span>
              <span><small>{creator} · {ralli}</small><strong>{pool} NIM received directly</strong></span>
            </div>
            <fieldset className="amount-picker">
              <legend>Choose an amount</legend>
              {presetAmounts.map((value) => (
                <button className={amount === value ? 'is-active' : ''} type="button" key={value} onClick={() => setAmount(value)}>{value} NIM</button>
              ))}
            </fieldset>
            <div className="field">
              <label htmlFor="custom-boost">Custom amount</label>
              <div className="input-with-icon"><Zap aria-hidden="true" /><input id="custom-boost" type="text" inputMode="decimal"
                autoComplete="off" value={amount} onChange={(event) => setAmount(event.target.value.replace(/[^0-9.]/g, ''))} /><strong>NIM</strong></div>
            </div>
            {error && <p className="payment-error" role="alert">{error}</p>}
            <div className="approval-note"><ShieldCheck aria-hidden="true" /><span>Nimiq Pay will show the recipient and amount before anything is sent.</span></div>
            <button className="button button--ink button--wide" type="submit" disabled={state === 'submitting'} aria-busy={state === 'submitting'}>
              {state === 'submitting' && <LoaderCircle className="spin" aria-hidden="true" />}
              {state === 'submitting' ? 'Waiting for approval…' : `Boost with ${amount || '0'} NIM`}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
