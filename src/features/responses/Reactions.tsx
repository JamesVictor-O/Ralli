import { useState } from 'react'
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
  const { user } = useBackend()
  const { account } = useWallet()

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
    } catch (failure) {
      setSelected(previous)
      setCount(previousCount)
      setError(actionableError(failure, 'Your reaction could not be saved. Try again.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`response-reactions ${compact ? 'response-reactions--compact' : ''}`} aria-label="React to this response">
      {reactionOptions.map((reaction) => (
        <button className={selected === reaction.label ? 'is-selected' : ''} type="button"
          aria-label={reaction.label} aria-pressed={selected === reaction.label} key={reaction.label}
          disabled={saving} onClick={() => void react(reaction.label)}>
          <span aria-hidden="true">{reaction.emoji}</span>
          {!compact && <small>{reaction.label}</small>}
        </button>
      ))}
      <span className="reaction-total">{count}</span>
      {error && <span className="reaction-error" role="alert">{error}</span>}
    </div>
  )
}
