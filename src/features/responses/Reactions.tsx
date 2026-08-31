import { useState } from 'react'

const reactionOptions = [
  { emoji: '😂', label: 'Funny' },
  { emoji: '🔥', label: 'Nailed it' },
  { emoji: '🤯', label: 'WTF' },
  { emoji: '👏', label: 'Respect' },
]

export function Reactions({ initialCount = 0, compact = false }: { initialCount?: number; compact?: boolean }) {
  const [selected, setSelected] = useState<string | null>(null)

  return (
    <div className={`response-reactions ${compact ? 'response-reactions--compact' : ''}`} aria-label="React to this response">
      {reactionOptions.map((reaction) => (
        <button className={selected === reaction.label ? 'is-selected' : ''} type="button"
          aria-label={reaction.label} aria-pressed={selected === reaction.label} key={reaction.label}
          onClick={() => setSelected((value) => value === reaction.label ? null : reaction.label)}>
          <span aria-hidden="true">{reaction.emoji}</span>
          {!compact && <small>{reaction.label}</small>}
        </button>
      ))}
      <span className="reaction-total">{initialCount + (selected ? 1 : 0)}</span>
    </div>
  )
}
