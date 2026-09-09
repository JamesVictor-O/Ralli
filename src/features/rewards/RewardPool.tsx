import { Sparkles, Zap } from 'lucide-react'

interface RewardPoolProps {
  total: number
  boosts: number
  onBoost: () => void
  compact?: boolean
}

export function RewardPool({ total, boosts, onBoost, compact = false }: RewardPoolProps) {
  return (
    <section className={`reward-pool ${compact ? 'reward-pool--compact' : ''}`} aria-label={`${total} NIM sent to the creator`}>
      <div className="reward-pool__amount">
        <span><Sparkles aria-hidden="true" /></span>
        <div><small>Direct creator support</small><strong>{total} NIM</strong></div>
      </div>
      <div className="reward-pool__story">
        <span><small>Community sent</small><strong>{boosts} NIM</strong></span>
      </div>
      <button className="reward-pool__boost" type="button" onClick={onBoost}>
        <Zap aria-hidden="true" /> Boost creator
      </button>
    </section>
  )
}
