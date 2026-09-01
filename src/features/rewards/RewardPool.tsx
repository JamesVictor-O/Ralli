import { Sparkles, Zap } from 'lucide-react'

interface RewardPoolProps {
  total: number
  starter: number
  boosts: number
  onBoost: () => void
  compact?: boolean
}

export function RewardPool({ total, starter, boosts, onBoost, compact = false }: RewardPoolProps) {
  return (
    <section className={`reward-pool ${compact ? 'reward-pool--compact' : ''}`} aria-label={`${total} NIM reward pool`}>
      <div className="reward-pool__amount">
        <span><Sparkles aria-hidden="true" /></span>
        <div><small>Live reward pool</small><strong>{total} NIM</strong></div>
      </div>
      <div className="reward-pool__story">
        <span><small>Started with</small><strong>{starter} NIM</strong></span>
        <i aria-hidden="true" />
        <span><small>Crowd added</small><strong>+{boosts} NIM</strong></span>
      </div>
      <button className="reward-pool__boost" type="button" onClick={onBoost}>
        <Zap aria-hidden="true" /> Boost pool
      </button>
    </section>
  )
}
