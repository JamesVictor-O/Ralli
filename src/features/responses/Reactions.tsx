import { useEffect, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { setReaction } from '../../lib/responses.ts'
import { ensureVerifiedProfile } from '../../lib/social.ts'
import { useBackend } from '../../store/backend.ts'
import { useWallet } from '../../store/wallet.ts'
import { actionableError } from '../../lib/errors.ts'

const reactionOptions = [
  { emoji: '😂', label: 'Funny' },
  { emoji: '🔥', label: 'Nailed it' },
  { emoji: '🤯', label: 'WTF' },
  { emoji: '👏', label: 'Respect' },
]

const reactionKinds: Record<string, string> = { Funny: 'funny', 'Nailed it': 'nailed_it', WTF: 'wow', Respect: 'respect' }

interface ReactionsProps { responseId: string; initialCount?: number; initialSelected?: string | null; compact?: boolean }

export function Reactions({ responseId, initialCount = 0, initialSelected = null, compact = false }: ReactionsProps) {
  const initialLabel = reactionOptions.find((option) => reactionKinds[option.label] === initialSelected)?.label ?? null
  const [selected, setSelected] = useState<string | null>(initialLabel)
  const [count, setCount] = useState(initialCount)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const { user } = useBackend()
  const { account } = useWallet()

  useEffect(() => {
    function close(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    function closeWithKeyboard(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', closeWithKeyboard)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', closeWithKeyboard) }
  }, [])

  async function react(label: string) {
    if (saving) return
    if (!user) {
      setError('Ralli is still connecting. Wait a moment, then try again.')
      return
    }
    const previous = selected
    const previousCount = count
    const next = previous === label ? null : label
    setSelected(next)
    setCount((value) => value + (!previous && next ? 1 : previous && !next ? -1 : 0))
    setSaving(true)
    setError('')
    try {
      await ensureVerifiedProfile(user.id, account)
      await setReaction(responseId, user.id, previous ? reactionKinds[previous] : null, next ? reactionKinds[next] : null)
      setOpen(false)
    } catch (failure) {
      setSelected(previous)
      setCount(previousCount)
      setError(actionableError(failure, 'Your reaction could not be saved. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`response-reactions ${compact ? 'response-reactions--compact' : ''}`} ref={rootRef} aria-label="React to this response">
      <button className={`reaction-trigger ${selected ? 'is-selected' : ''}`} type="button" aria-expanded={open} disabled={saving} onClick={() => setOpen((value) => !value)}>
        <span aria-hidden="true">{reactionOptions.find((option) => option.label === selected)?.emoji ?? '♡'}</span><small>{selected ?? 'React'}</small>{count > 0 && <strong>{count}</strong>}<ChevronDown aria-hidden="true" />
      </button>
      {open && <div className="reaction-picker" role="group" aria-label="Choose a reaction">{reactionOptions.map((reaction) => (
        <button className={selected === reaction.label ? 'is-selected' : ''} type="button" aria-label={reaction.label} aria-pressed={selected === reaction.label} key={reaction.label} disabled={saving} onClick={() => void react(reaction.label)}><span aria-hidden="true">{reaction.emoji}</span><small>{reaction.label}</small></button>
      ))}</div>}
      {error && <span className="reaction-error" role="alert">{error}</span>}
    </div>
  )
}
