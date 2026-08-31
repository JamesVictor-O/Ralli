import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Search, Send, Share2, X } from 'lucide-react'

const friends = [
  { name: 'Maya', initials: 'MK', tone: 'coral' },
  { name: 'Kofi', initials: 'KA', tone: 'blue' },
  { name: 'Lea', initials: 'LM', tone: 'violet' },
  { name: 'Jo', initials: 'JN', tone: 'lime' },
]

export function PassItOn({ onClose, responseAuthor }: { onClose: () => void; responseAuthor: string }) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [copied, setCopied] = useState(false)
  const [shared, setShared] = useState(false)
  const ralliUrl = `${window.location.origin}${window.location.pathname}?ralli=weirdest-desk-item`
  const nativeShare = (navigator as unknown as { share?: (data: ShareData) => Promise<void> }).share
  const visibleFriends = useMemo(() => friends.filter((friend) => friend.name.toLowerCase().includes(query.toLowerCase())), [query])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  function toggleFriend(name: string) {
    setSelected((current) => current.includes(name) ? current.filter((item) => item !== name) : [...current, name])
  }

  async function copyLink() {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(ralliUrl)
    } else {
      const field = document.createElement('textarea')
      field.value = ralliUrl
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

  async function shareRalli() {
    const invitees = selected.length ? ` ${selected.join(', ')}, you have to try this.` : ''
    const shareData = {
      title: 'Join this Ralli',
      text: `${responseAuthor} just joined “Show us the weirdest thing on your desk.”${invitees}`,
      url: ralliUrl,
    }
    try {
      if (nativeShare) {
        await nativeShare.call(navigator, shareData)
      } else {
        await copyLink()
      }
      setShared(true)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return
      await copyLink()
      setShared(true)
    }
  }

  return createPortal(
    <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="pass-title">
      <section className="pass-panel">
        <header className="wallet-panel__header">
          <div><p className="eyebrow">Keep it moving</p><h2 id="pass-title">Pass this Ralli on</h2></div>
          <button className="icon-button" type="button" aria-label="Close Pass It On" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        {shared ? (
          <div className="pass-success" aria-live="polite">
            <span><Check aria-hidden="true" /></span>
            <h3>It’s moving</h3>
            <p>Your invite is ready. Every person who joins adds another link to the chain.</p>
            <button className="button button--ink button--wide" type="button" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            <div className="pass-context">
              <span className="avatar avatar--response avatar--lime">{responseAuthor.slice(0, 1)}</span>
              <div><small>Passing on after {responseAuthor}’s response</small><strong>Show us the weirdest thing on your desk.</strong></div>
            </div>

            <div className="friend-search">
              <label className="sr-only" htmlFor="friend-search">Find a friend</label>
              <Search aria-hidden="true" />
              <input id="friend-search" type="search" autoComplete="off" placeholder="Find a friend…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>

            <fieldset className="friend-picker">
              <legend>Who are you challenging? <span>Optional</span></legend>
              {visibleFriends.map((friend) => (
                <button className={selected.includes(friend.name) ? 'is-selected' : ''} type="button"
                  aria-pressed={selected.includes(friend.name)} key={friend.name} onClick={() => toggleFriend(friend.name)}>
                  <span className={`avatar avatar--author avatar--${friend.tone}`}>{friend.initials}</span>
                  <strong>{friend.name}</strong>
                  <span className="friend-check">{selected.includes(friend.name) && <Check aria-hidden="true" />}</span>
                </button>
              ))}
            </fieldset>

            <div className="pass-link">
              <div><small>Shareable Ralli link</small><code>{ralliUrl.replace(/^https?:\/\//, '')}</code></div>
              <button type="button" aria-label={copied ? 'Ralli link copied' : 'Copy Ralli link'} onClick={() => void copyLink()}>
                {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
              </button>
            </div>

            <button className="button button--ink button--wide pass-share" type="button" onClick={() => void shareRalli()}>
              {nativeShare ? <Share2 aria-hidden="true" /> : <Send aria-hidden="true" />}
              {nativeShare ? 'Open share sheet' : 'Copy invite link'}
            </button>
          </>
        )}
      </section>
    </div>,
    document.body,
  )
}
