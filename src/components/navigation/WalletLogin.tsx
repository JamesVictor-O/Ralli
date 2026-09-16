import { useEffect, useRef } from 'react'
import { Camera, LoaderCircle, RefreshCw, Repeat2, ShieldCheck, UsersRound, Zap } from 'lucide-react'
import { useWalletVerification } from '../../hooks/useWalletVerification.ts'
import { readBrowserStorage, removeBrowserStorage, writeBrowserStorage } from '../../lib/browserStorage.ts'
import { isNimiqPayContext } from '../../nimiq/hub.ts'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'

const PENDING_VERIFICATION_KEY = 'ralli-login-verification-pending'

export function WalletLogin({ onVerified }: { onVerified: () => void }) {
  const { status, account, error, connect, retry } = useWallet()
  const { status: backendStatus } = useBackend()
  const verification = useWalletVerification(account)
  const autoVerificationStarted = useRef(false)
  const embedded = isNimiqPayContext()

  useEffect(() => {
    if (verification.status === 'verified') {
      removeBrowserStorage('session', PENDING_VERIFICATION_KEY)
      onVerified()
    }
  }, [onVerified, verification.status])

  useEffect(() => {
    if (error && status !== 'connecting' && status !== 'connected') {
      removeBrowserStorage('session', PENDING_VERIFICATION_KEY)
    }
  }, [error, status])

  useEffect(() => {
    const shouldVerify = readBrowserStorage('session', PENDING_VERIFICATION_KEY) === 'after-connect'
    if (!shouldVerify || status !== 'connected' || !account || verification.status !== 'unverified' || autoVerificationStarted.current) return
    autoVerificationStarted.current = true
    // Consume the handoff before requesting the signature. Mobile Hub performs a
    // second full-page redirect here; clearing first prevents the return trip from
    // starting another signature request while verification is being finalized.
    removeBrowserStorage('session', PENDING_VERIFICATION_KEY)
    void verification.verify()
  }, [account, status, verification])

  async function connectAndVerify() {
    autoVerificationStarted.current = false
    // Keep the user's original intent across both popup and redirect-based wallet
    // connections. Once an address is available, the effect above automatically
    // continues into verification without requiring another tap in Ralli.
    writeBrowserStorage('session', PENDING_VERIFICATION_KEY, 'after-connect')
    await connect()
  }

  async function verifyAndContinue() {
    autoVerificationStarted.current = true
    await verification.verify()
  }

  const preparing = backendStatus === 'initializing' || status === 'initializing' || verification.status === 'checking' || (status === 'connected' && Boolean(account) && verification.status === 'idle')
  const connecting = status === 'connecting'
  const verifying = verification.status === 'verifying'
  const connected = status === 'connected' && Boolean(account)
  const hasError = status === 'error' || verification.status === 'error' || Boolean(error)
  const entryTitle = connected && verification.status !== 'verified' ? 'One quick signature.' : 'Enter with Nimiq.'

  return (
    <main className="wallet-login" aria-labelledby="wallet-login-title">
      <header className="wallet-login__header">
        <span className="brand wallet-login__brand">
          <img className="brand-mark" src="/railIcon.png" width="1254" height="1254" alt="" />
          <span>ralli</span>
        </span>
        <span className="wallet-login__powered"><i aria-hidden="true">N</i>Powered by Nimiq</span>
      </header>

      <section className="wallet-login__hero">
        <div className="wallet-login__copy">
          <p className="eyebrow">Social is better when you join in</p>
          <h1 id="wallet-login-title">Don’t just scroll.<br /><em>Show up.</em></h1>
          <p>Start challenges, answer with your take, and pull someone else into the fun.</p>
        </div>

        <div className="wallet-login__right-column">
          <div className="wallet-login__playground" aria-label="The Ralli loop">
            <article className="wallet-login__prompt wallet-login__prompt--first">
              <span><Camera aria-hidden="true" /></span>
              <div><small>Today’s Ralli</small><strong>Show us the view from where you are.</strong></div>
            </article>
            <article className="wallet-login__prompt wallet-login__prompt--second">
              <span><UsersRound aria-hidden="true" /></span>
              <div><small>Your community</small><strong>People are already showing up.</strong></div>
            </article>
            <article className="wallet-login__prompt wallet-login__prompt--third">
              <span><Repeat2 aria-hidden="true" /></span>
              <div><small>Pass it on</small><strong>One response starts a chain.</strong></div>
            </article>
            <span className="wallet-login__turn"><Zap aria-hidden="true" />Your turn</span>
          </div>

          <section className="wallet-login__entry" aria-describedby="wallet-login-description">
            <div className="wallet-login__entry-copy">
              <div><p className="eyebrow">No email. No password.</p><h2>{entryTitle}</h2><p id="wallet-login-description">{connected ? 'Sign a message to prove this address is yours. No NIM moves.' : `Use your ${embedded ? 'Nimiq Pay' : 'Nimiq'} wallet as your Ralli identity.`}</p></div>
            </div>

            <div className="wallet-login__entry-action">
              {hasError && <div className="wallet-login__error" role="alert"><strong>Couldn’t sign you in.</strong><span>{verification.error || error || 'The wallet provider is not ready yet.'}</span></div>}
              {status === 'error' ? (
                <button className="button wallet-login__action" type="button" onClick={() => void retry()}><RefreshCw aria-hidden="true" />Try again</button>
              ) : connected && (verification.status === 'unverified' || verification.status === 'error') ? (
                <button className="button wallet-login__action" type="button" onClick={() => void verifyAndContinue()}><ShieldCheck aria-hidden="true" />Verify and enter </button>
              ) : (
                <button className="button wallet-login__action" type="button" disabled={preparing || connecting || verifying}
                  aria-busy={preparing || connecting || verifying} onClick={() => void connectAndVerify()}>
                  {(preparing || connecting || verifying) && <LoaderCircle className="spin" aria-hidden="true" />}
                  {backendStatus === 'initializing' ? 'Getting Ralli ready…' : preparing ? 'Checking your identity…' : connecting ? 'Choose your address…' : verifying ? 'Confirm in your wallet…' : <>Login with Nimiq</>}
                </button>
              )}
              <p className="wallet-login__safety"><ShieldCheck aria-hidden="true" /><span>Your keys stay in your wallet. Payments always ask first.</span></p>
            </div>
          </section>
        </div>
      </section>
    </main>
  )
}
