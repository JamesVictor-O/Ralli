import { useEffect, useState } from 'react'
import { AlertCircle, Check, Copy, ExternalLink, LoaderCircle, RefreshCw, ShieldCheck, WalletCards, X } from 'lucide-react'
import { useWallet } from '../../store/wallet.ts'
import { useWalletVerification } from '../../hooks/useWalletVerification.ts'
import { useNimBalance } from '../../hooks/useNimBalance.ts'
import { isNimiqPayContext } from '../../nimiq/hub.ts'

function shortenAddress(address: string) {
  return `${address.slice(0, 9)}…${address.slice(-6)}`
}

export function WalletPanel({ onClose }: { onClose: () => void }) {
  const { status, account, consensus, blockNumber, error, connect, retry, disconnect } = useWallet()
  const [copied, setCopied] = useState(false)
  const verification = useWalletVerification(account)
  const balance = useNimBalance(status === 'connected' ? account : null)
  const embedded = isNimiqPayContext()

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  async function copyAddress(address: string) {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(address)
    } else {
      const field = document.createElement('textarea')
      field.value = address
      field.style.position = 'fixed'
      field.style.opacity = '0'
      document.body.appendChild(field)
      field.select()
      document.execCommand('copy')
      field.remove()
    }
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="wallet-backdrop" role="dialog" aria-modal="true" aria-labelledby="wallet-title">
      <section className="wallet-panel">
        <header className="wallet-panel__header">
          <div><p className="eyebrow">{embedded ? 'Nimiq Pay' : 'Nimiq Hub'}</p><h2 id="wallet-title">Your Nimiq wallet</h2></div>
          <button className="icon-button" type="button" aria-label="Close wallet" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {status === 'initializing' && (
          <div className="wallet-state" aria-live="polite">
            <span className="wallet-state__icon"><LoaderCircle className="spin" aria-hidden="true" /></span>
            <h3>Checking Nimiq Pay</h3><p>Making sure the wallet provider is ready.</p>
          </div>
        )}

        {status === 'unavailable' && (
          <div className="wallet-state">
            <span className="wallet-state__icon wallet-state__icon--violet"><WalletCards aria-hidden="true" /></span>
            <h3>Open Ralli in Nimiq Pay</h3>
            <p>You can explore Ralli here. To connect an account or send NIM, load this app from the Mini Apps section in Nimiq Pay.</p>
          </div>
        )}

        {status === 'error' && (
          <div className="wallet-state" role="alert">
            <span className="wallet-state__icon wallet-state__icon--coral"><AlertCircle aria-hidden="true" /></span>
            <h3>Wallet unavailable</h3><p>{error}</p>
            <button className="button button--ink" type="button" onClick={() => void retry()}>Try again</button>
          </div>
        )}

        {(status === 'ready' || status === 'connecting') && (
          <div className="wallet-state">
            <span className="wallet-state__icon"><ShieldCheck aria-hidden="true" /></span>
            <h3>Connect when you need it</h3>
            <p>{embedded
              ? 'Choose your public address in Nimiq Pay. Your keys always stay in the wallet.'
              : 'Nimiq Hub will open so you can choose a public address. Your keys never enter Ralli.'}</p>
            {error && <p className="wallet-inline-error" role="status">{error}</p>}
            <button className="button button--ink button--wide" type="button" disabled={status === 'connecting'}
              aria-busy={status === 'connecting'} onClick={() => void connect()}>
              {status === 'connecting' && <LoaderCircle className="spin" aria-hidden="true" />}
              {status === 'connecting' ? 'Waiting for approval…' : 'Connect Nimiq account'}
            </button>
          </div>
        )}

        {status === 'connected' && account && (
          <>
            <div className="connected-card">
              <div className="connected-card__status">
                <span>{verification.status === 'checking' ? <LoaderCircle className="spin" aria-hidden="true" /> : <Check aria-hidden="true" />}</span>
                <strong>{verification.status === 'verified' ? 'Verified on Ralli' : 'Connected'}</strong>
              </div>
              <p>Public address</p>
              <div className="address-row">
                <code>{shortenAddress(account)}</code>
                <button type="button" aria-label={copied ? 'Wallet address copied' : 'Copy wallet address'} onClick={() => void copyAddress(account)}>
                  {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
                </button>
              </div>
              <div className="balance-row">
                <span><small>Balance</small>
                  <strong>
                    {balance.status === 'loading' && <LoaderCircle className="spin" aria-hidden="true" />}
                    {balance.status === 'ready' && balance.balance !== null && `${balance.balance.toLocaleString(undefined, { maximumFractionDigits: 5 })} NIM`}
                    {balance.status === 'error' && '— NIM'}
                  </strong>
                </span>
                <button type="button" aria-label="Refresh balance" disabled={balance.status === 'loading'} onClick={() => void balance.refresh()}>
                  <RefreshCw aria-hidden="true" />
                </button>
              </div>
              {balance.status === 'error' && <p className="wallet-inline-error" role="status">{balance.error}</p>}
              <div className="network-row">
                <span><i className={consensus ? 'is-online' : ''} />{consensus ? 'Network ready' : 'Syncing network'}</span>
                {blockNumber !== null && <span>Block {blockNumber.toLocaleString()}</span>}
              </div>
            </div>
            {verification.status !== 'verified' && (
              <div className="wallet-verification">
                <ShieldCheck aria-hidden="true" />
                <div>
                  <strong>Verify that this address is yours</strong>
                  <span>Sign one Ralli message in Nimiq Pay. This does not send NIM or approve future payments.</span>
                  {verification.error && <p role="alert">{verification.error}</p>}
                  <button type="button" disabled={verification.status === 'checking' || verification.status === 'verifying'}
                    aria-busy={verification.status === 'verifying'} onClick={() => void verification.verify()}>
                    {verification.status === 'verifying' && <LoaderCircle className="spin" aria-hidden="true" />}
                    {verification.status === 'verifying' ? 'Waiting for signature…' : verification.status === 'error' ? 'Try verification again' : 'Verify address'}
                  </button>
                </div>
              </div>
            )}
            {verification.status === 'verified' && (
              <div className="wallet-verified-note"><ShieldCheck aria-hidden="true" /><span><strong>Identity verified</strong>Your Rallis, responses, rewards, and tips can now be tied to this address.</span></div>
            )}
            <div className="wallet-security">
              <ShieldCheck aria-hidden="true" />
              <p><strong>Every payment asks first.</strong><span>Ralli cannot move NIM without a native Nimiq Pay approval.</span></p>
            </div>
            <div className="wallet-panel__actions">
              <a href="https://wallet.nimiq.com/" target="_blank" rel="noreferrer">Open wallet <ExternalLink aria-hidden="true" /></a>
              <button type="button" onClick={disconnect}>Disconnect from Ralli</button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
