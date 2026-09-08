import { type FormEvent, useEffect, useRef, useState } from 'react'
import { ChevronDown, Coins, LoaderCircle } from 'lucide-react'
import { nimToLuna, sendNimPayment } from '../../nimiq/payments.ts'
import { confirmPayment, recordPaymentSubmission } from '../../lib/payments.ts'
import { useWallet } from '../../store/wallet.ts'

const presetAmounts = ['1', '5', '10']

function tipError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return /reject|declin|cancel|denied/i.test(message) ? null : message
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
  const rootRef = useRef<HTMLDivElement>(null)

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

  async function send(amount: string) {
    if (sending || !recipientAddress || Number(amount) <= 0) return
    setPickerOpen(false)
    setCustomOpen(false)
    setError('')
    if (status !== 'connected') {
      try {
        await connect()
      } catch {
        // connect() already records a wallet-level error; nothing more to do here.
      }
      return
    }
    setSending(true)
    try {
      const transactionHash = await sendNimPayment({ recipient: recipientAddress, amountNim: amount, message: `Ralli tip: ${responseId}` })
      await recordPaymentSubmission({ kind: 'tip', responseId, amountLuna: nimToLuna(amount), transactionHash })
      setTotal((value) => value + Number(amount))
      // The chip already reflects the tip optimistically — this just makes it real in the
      // database. A slow/failed confirmation here doesn't need to revert the total: the
      // payment did go out, it just takes another look to actually count as confirmed.
      confirmPayment({ kind: 'tip', transactionHash }).catch((confirmFailure) => {
        console.error('Tip confirmation failed', confirmFailure)
      })
    } catch (failure) {
      const message = tipError(failure)
      if (message) setError(message)
    } finally {
      setSending(false)
    }
  }

  function submitCustom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void send(customValue)
  }

  const disabled = !recipientAddress

  return (
    <div className={`tip-chip ${pickerOpen ? 'is-open' : ''}`} ref={rootRef}>
      <button className="tip-chip__send" type="button" disabled={disabled || sending}
        aria-label={disabled ? `${author} hasn't verified a wallet yet` : status !== 'connected' ? `Connect your wallet to tip ${author}` : `Tip ${author} 1 NIM`}
        onClick={() => void send('1')}>
        {sending ? <LoaderCircle className="spin" aria-hidden="true" /> : <Coins aria-hidden="true" />}
        <span>{total > 0 ? `${total} NIM` : '+1 NIM'}</span>
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
            <button className="tip-chip__option" type="button" role="menuitem" key={value} onClick={() => void send(value)}>+{value}</button>
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
    </div>
  )
}
