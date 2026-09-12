import { type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Coins, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { nimToLuna, sendNimPayment } from '../../nimiq/payments.ts'
import { confirmPayment, recordPaymentSubmission } from '../../lib/payments.ts'
import { useWallet } from '../../store/wallet.ts'
import { actionableError } from '../../lib/errors.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'
import { useDialogFocus } from '../../hooks/useDialogFocus.ts'

const presetAmounts = ['1', '5', '10']

function tipError(error: unknown) {
  return actionableError(error, 'The tip could not be sent. No NIM was deducted—try again.')
}

interface TipChipProps {
  responseId: string
  recipientAddress: string | null
  author: string
  initialTotal?: number
}

export function TipChip({ responseId, recipientAddress, author, initialTotal = 0 }: TipChipProps) {
  const { status, connect } = useWallet()
  const [total, setTotal] = useState(initialTotal)
  const [sending, setSending] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const [customValue, setCustomValue] = useState('')
  const [error, setError] = useState('')
  const [pendingAmount, setPendingAmount] = useState<string | null>(null)
  const [paymentState, setPaymentState] = useState<'idle' | 'confirming' | 'confirmed' | 'sent-unconfirmed'>('idle')
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const closeReview = useCallback(() => {
    if (!sending && paymentState !== 'confirming') setPendingAmount(null)
  }, [sending, paymentState])

  useBodyScrollLock(Boolean(pendingAmount))
  useDialogFocus(dialogRef, Boolean(pendingAmount), closeReview)

  useEffect(() => {
    function closeOnOutside(event: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setPickerOpen(false)
        setCustomOpen(false)
      }
    }
    document.addEventListener('mousedown', closeOnOutside)
    return () => document.removeEventListener('mousedown', closeOnOutside)
  }, [])

  function review(amount: string) {
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a NIM amount greater than zero.')
      return
    }
    setPickerOpen(false)
    setCustomOpen(false)
    setError('')
    setPendingAmount(amount)
    setPaymentState('idle')
  }

  async function send(amount: string) {
    if (sending || !recipientAddress) return
    if (!Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      setError('Enter a NIM amount greater than zero.')
      return
    }
    setPickerOpen(false)
    setCustomOpen(false)
    setError('')
    if (status !== 'connected') {
      try {
        await connect()
      } catch {
        // connect() already records a wallet-level error; nothing more to do here.
      }
      setError('Wallet connected. Review the tip, then approve it in your wallet.')
      return
    }
    setSending(true)
    try {
      const transactionHash = await sendNimPayment({ recipient: recipientAddress, amountNim: amount, message: `Ralli tip: ${responseId}` })
      await recordPaymentSubmission({ kind: 'tip', responseId, amountLuna: nimToLuna(amount), transactionHash })
      setTotal((value) => value + Number(amount))
      setPaymentState('confirming')
      confirmPayment({ kind: 'tip', transactionHash }).then(() => {
        setPaymentState('confirmed')
      }).catch((confirmFailure) => {
        console.error('Tip confirmation failed', confirmFailure)
        setPaymentState('sent-unconfirmed')
      })
    } catch (failure) {
      setError(tipError(failure))
    } finally {
      setSending(false)
    }
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    review(customValue)
  }

  const disabled = !recipientAddress

  return (
    <div className={`tip-chip ${pickerOpen ? 'is-open' : ''}`} ref={rootRef}>
      <button className="tip-chip__send" type="button" disabled={disabled || sending}
        aria-label={disabled ? `${author} hasn't verified a wallet yet` : status !== 'connected' ? `Connect your wallet to tip ${author}` : `Tip ${author} 1 NIM`}
        onClick={() => review('1')}>
        {sending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Coins aria-hidden="true" />}
        <span>{total > 0 ? `${total} NIM tipped` : 'Tip with NIM'}</span>
      </button>
      {!disabled && (
        <button className="tip-chip__caret" type="button" aria-label="Choose a tip amount" aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((value) => !value)}>
          <ChevronDown aria-hidden="true" />
        </button>
      )}
      {pickerOpen && (
        <div className="tip-chip__picker" role="menu">
          {presetAmounts.map((value) => (
            <button className="tip-chip__option" type="button" role="menuitem" key={value} onClick={() => review(value)}>+{value}</button>
          ))}
          {customOpen ? (
            <form className="tip-chip__custom" onSubmit={submitCustom}>
              <input type="text" inputMode="decimal" autoFocus placeholder="NIM" aria-label="Custom tip amount"
                value={customValue} onChange={(event) => setCustomValue(event.target.value.replace(/[^0-9.]/g, ''))} />
              <button type="submit">Send</button>
            </form>
          ) : (
            <button className="tip-chip__option" type="button" role="menuitem" onClick={() => setCustomOpen(true)}>Custom</button>
          )}
        </div>
      )}
      {error && <span className="tip-chip__error" role="alert">{error}</span>}
      {pendingAmount && (
        <div className="wallet-backdrop wallet-backdrop--nested tip-review-backdrop" role="dialog" aria-modal="true" aria-labelledby={`tip-review-${responseId}`}>
          <section className="tip-review" ref={dialogRef}>
            <header><div><p className="eyebrow">Direct NIM tip</p><h2 id={`tip-review-${responseId}`}>Tip {author}</h2></div><button className="icon-button" type="button" aria-label="Close tip" disabled={sending || paymentState === 'confirming'} onClick={closeReview}><X aria-hidden="true" /></button></header>
            {paymentState === 'confirmed' ? <div className="payment-success" aria-live="polite"><span><Check aria-hidden="true" /></span><h3>Tip confirmed</h3><p>{pendingAmount} NIM was sent directly to {author}.</p><button className="button button--ink button--wide" type="button" onClick={() => setPendingAmount(null)}>Done</button></div>
              : paymentState === 'sent-unconfirmed' ? <div className="payment-success" aria-live="polite"><span><Check aria-hidden="true" /></span><h3>Tip sent</h3><p>The transaction is on the network and taking longer than usual. Don’t send it again.</p><button className="button button--ink button--wide" type="button" onClick={() => setPendingAmount(null)}>Done</button></div>
              : <><div className="tip-review__summary"><span className="avatar avatar--author avatar--lime">{author.slice(0, 2).toUpperCase()}</span><div><small>You are sending</small><strong>{pendingAmount} NIM to {author}</strong><code title={recipientAddress ?? ''}>{recipientAddress ? `${recipientAddress.slice(0, 9)}…${recipientAddress.slice(-6)}` : ''}</code></div></div><div className="approval-note"><ShieldCheck aria-hidden="true" /><span>{paymentState === 'confirming' ? 'Payment sent. Waiting for network confirmation…' : 'Your wallet will ask you to approve this exact amount and recipient. Network fees are shown there.'}</span></div>{error && <p className="payment-error" role="alert">{error}</p>}<button className="button button--ink button--wide" type="button" disabled={sending || paymentState === 'confirming'} aria-busy={sending || paymentState === 'confirming'} onClick={() => void send(pendingAmount)}>{(sending || paymentState === 'confirming') && <LoaderCircle className="spin" aria-hidden="true" />}{sending ? 'Waiting for approval…' : paymentState === 'confirming' ? 'Confirming on-chain…' : `Tip ${pendingAmount} NIM`}</button></>}
          </section>
        </div>
      )}
    </div>
  )
}
