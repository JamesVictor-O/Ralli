import { type FormEvent, useEffect, useState } from 'react'
import { Check, HandCoins, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { nimToLuna, sendNimPayment } from '../../nimiq/payments.ts'
import { useWallet } from '../../store/wallet.ts'
import { recordPaymentSubmission } from '../../lib/payments.ts'

const amounts = ['0.5', '1', '2', '5']

function tipError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  if (/reject|declin|cancel|denied/i.test(message)) return 'Tip cancelled. No NIM was sent.'
  return message
}

export function Tip({ responseId, recipientAddress, author, onClose }: { responseId: string; recipientAddress: string | null; author: string; onClose: () => void }) {
  const { status, connect } = useWallet()
  const [amount, setAmount] = useState('1')
  const [state, setState] = useState<'idle' | 'submitting' | 'success'>('idle')
  const [error, setError] = useState('')
  const recipient = recipientAddress ?? undefined

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
      const transactionHash = await sendNimPayment({ recipient: recipient ?? '', amountNim: amount, message: `Ralli tip: ${responseId}` })
      await recordPaymentSubmission({ kind: 'tip', responseId, amountLuna: nimToLuna(amount), transactionHash })
      setState('success')
    } catch (failure) {
      setError(tipError(failure))
      setState('idle')
    }
  }

  return (
    <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="tip-title">
      <section className="payment-panel">
        <header className="wallet-panel__header">
          <div><p className="eyebrow">Reward the response</p><h2 id="tip-title">Tip {author}</h2></div>
          <button className="icon-button" type="button" aria-label="Close Tip" disabled={state === 'submitting'} onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {state === 'success' ? (
          <div className="payment-success" aria-live="polite">
            <span><Check aria-hidden="true" /></span><h3>Tip sent</h3>
            <p>Your {amount} NIM tip was sent and its receipt is recorded for confirmation.</p>
            <button className="button button--ink button--wide" type="button" onClick={onClose}>Done</button>
          </div>
        ) : status !== 'connected' ? (
          <div className="wallet-state">
            <span className="wallet-state__icon"><ShieldCheck aria-hidden="true" /></span>
            <h3>Connect before tipping</h3>
            <p>Choose your public account first. You’ll approve the tip separately in Nimiq Pay.</p>
            <button className="button button--ink button--wide" type="button" disabled={status === 'connecting'} aria-busy={status === 'connecting'} onClick={() => void connect()}>
              {status === 'connecting' ? 'Waiting for approval…' : 'Connect Nimiq account'}
            </button>
          </div>
        ) : !recipient ? (
          <div className="wallet-state" role="alert">
            <span className="wallet-state__icon wallet-state__icon--coral"><HandCoins aria-hidden="true" /></span>
            <h3>Tips need a recipient</h3>
            <p>{author} needs to verify a Nimiq address before receiving tips.</p>
            <button className="button button--soft" type="button" onClick={onClose}>Close</button>
          </div>
        ) : (
          <form className="payment-form" onSubmit={submit}>
            <div className="tip-intent"><HandCoins aria-hidden="true" /><p><strong>This response made your day.</strong><span>Send real value, not another point.</span></p></div>
            <fieldset className="amount-picker">
              <legend>Choose a tip</legend>
              {amounts.map((value) => <button className={amount === value ? 'is-active' : ''} type="button" key={value} onClick={() => setAmount(value)}>{value} NIM</button>)}
            </fieldset>
            {error && <p className="payment-error" role="alert">{error}</p>}
            <div className="approval-note"><ShieldCheck aria-hidden="true" /><span>Nimiq Pay will show the recipient and amount before sending.</span></div>
            <button className="button button--ink button--wide" type="submit" disabled={state === 'submitting'} aria-busy={state === 'submitting'}>
              {state === 'submitting' && <LoaderCircle className="spin" aria-hidden="true" />}
              {state === 'submitting' ? 'Waiting for approval…' : `Tip ${amount} NIM`}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
