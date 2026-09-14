import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { ensureVerifiedProfile } from '../../lib/social.ts'
import { actionableError } from '../../lib/errors.ts'
import { fetchRalliReactions, setRalliReaction } from '../../lib/responses.ts'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'

const options = [
  { emoji: '😂', label: 'Funny', kind: 'funny' },
  { emoji: '🔥', label: 'Nailed it', kind: 'nailed_it' },
  { emoji: '🤯', label: 'WTF', kind: 'wow' },
  { emoji: '👏', label: 'Respect', kind: 'respect' },
]

export function RalliReactions({ ralliId }: { ralliId: string }) {
  const { user } = useBackend()
  const { account } = useWallet()
  const [selected, setSelected] = useState<string | null>(null)
  const [count, setCount] = useState(0)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const root = useRef<HTMLDivElement>(null)

  useEffect(() => {
    void fetchRalliReactions(ralliId, user?.id ?? null).then((result) => {
      setCount(result.count)
      setSelected(result.selected)
    }).catch(() => undefined)
  }, [ralliId, user?.id])

  useEffect(() => {
    const close = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [])

  async function react(kind: string) {
    if (!user || saving) return
    const previous = selected
    const previousCount = count
    const next = previous === kind ? null : kind
    setSelected(next)
    setCount((value) => value + (!previous && next ? 1 : previous && !next ? -1 : 0))
    setSaving(true)
    setError('')
    try {
      await ensureVerifiedProfile(user.id, account)
      await setRalliReaction(ralliId, user.id, previous, next)
      setOpen(false)
    } catch (failure) {
      setSelected(previous)
      setCount(previousCount)
      setError(actionableError(failure, 'Your reaction could not be saved. Try again.'))
    } finally { setSaving(false) }
  }

  const chosen = options.find((option) => option.kind === selected)
  return <div className="response-reactions" ref={root}>
    <button className={`reaction-trigger ${selected ? 'is-selected' : ''}`} type="button" disabled={saving} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      <span aria-hidden="true">{chosen?.emoji ?? '♡'}</span><small>{chosen?.label ?? 'React'}</small>{count > 0 && <strong>{count}</strong>}<ChevronDown aria-hidden="true" />
    </button>
    {open && <div className="reaction-picker" role="group" aria-label="React to this Ralli">{options.map((option) => <button className={selected === option.kind ? 'is-selected' : ''} type="button" key={option.kind} disabled={saving} aria-pressed={selected === option.kind} onClick={() => void react(option.kind)}><span aria-hidden="true">{option.emoji}</span><small>{option.label}</small></button>)}</div>}
    {error && <span className="reaction-error" role="alert">{error}</span>}
  </div>
}
