import { ArrowUpRight, UsersRound } from 'lucide-react'
import type { Community } from '../../lib/communities.ts'

const compact = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 })

export function CommunityCard({ community, onOpen, onMembership }: {
  community: Community
  onOpen: () => void
  onMembership: () => void
}) {
  return (
    <article className="community-card">
      <button className="community-card__hit" type="button" aria-label={`Open ${community.name} community`} onClick={onOpen} />
      <header>
        <span className="community-card__icon" aria-hidden="true">{community.icon}</span>
        <button className={`community-join ${community.joined ? 'is-joined' : ''}`} type="button"
          aria-label={`${community.joined ? 'Leave' : 'Join'} ${community.name}`} onClick={onMembership}>
          {community.joined ? 'Joined' : 'Join'}
        </button>
      </header>
      <div>
        <h2>{community.name}</h2>
        <p>{community.description}</p>
      </div>
      <footer>
        <span><UsersRound aria-hidden="true" /> {compact.format(community.members)} members</span>
        <span>{compact.format(community.responses)} responses</span>
        <ArrowUpRight aria-hidden="true" />
      </footer>
    </article>
  )
}
