import { type FormEvent, useEffect, useState } from 'react'
import { Check, LoaderCircle, ShieldCheck, X, Zap } from 'lucide-react'
import { useWallet } from '../../store/wallet.ts'
import { sendNimPayment } from '../../nimiq/payments.ts'

const presetAmounts = ['1', '2', '5', '10']

function paymentError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/reject|declin|cancel|denied/i.test(message)) return 'Payment cancelled. No NIM was sent.'
  return message
}

interface BoostProps {
  onClose: () => void
  creator?: string
  ralli?: string
  pool?: number
}

export function Boost({ onClose, creator = 'Nia', ralli = 'weirdest desk item', pool = 12 }: BoostProps) {
  const { status, connect } = useWallet()
  const [amount, setAmount] = useState('2')
  const [state, setState] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState('')
  const recipient = import.meta.env.VITE_RALLI_CREATOR_ADDRESS as string | undefined

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && state !== 'submitting' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose, state])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setState('submitting')
    try {
      await sendNimPayment({ recipient: recipient ?? '', amountNim: amount, message: `Ralli boost: ${ralli}` })
      setState('success')
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
          <button className="icon-button" type="button" aria-label="Close Boost" disabled={state === 'submitting'} onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {state === 'success' ? (
          <div className="payment-success" aria-live="polite">
            <span><Check aria-hidden="true" /></span><h3>Boost sent</h3>
            <p>Your {amount} NIM was added to the Ralli. The crowd wants to see this.</p>
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
        ) : !recipient ? (
          <div className="wallet-state" role="alert">
            <span className="wallet-state__icon wallet-state__icon--coral"><Zap aria-hidden="true" /></span>
            <h3>Boosts need a recipient</h3>
            <p>Add the creator’s public Nimiq address to <code>VITE_RALLI_CREATOR_ADDRESS</code> before accepting payments.</p>
            <button className="button button--soft" type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="payment-form" onSubmit={submit}>
            <div className="payment-recipient">
              <span className="avatar avatar--author avatar--coral">{creator.slice(0, 2).toUpperCase()}</span>
              <span><small>Boosting {creator}’s Ralli</small><strong>Reward pool · {pool} NIM</strong></span>
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
