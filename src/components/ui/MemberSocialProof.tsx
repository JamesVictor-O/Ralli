import { RefreshCw } from 'lucide-react'
import { useRecentMembers } from '../../hooks/useRecentMembers.ts'
import { Avatar } from './Avatar.tsx'

export function MemberSocialProof() {
  const { members, total, status, refresh } = useRecentMembers()

  if (status === 'loading') return <div className="member-proof member-proof--loading" aria-label="Loading recent members" aria-busy="true"><span /><span /><span /><i /></div>
  if (status === 'error') return <button className="member-proof__retry" type="button" onClick={() => void refresh()}><RefreshCw aria-hidden="true" /> See who recently joined</button>

  return <div className="member-proof">
    {members.length > 0 && <div className="member-proof__avatars" aria-hidden="true">{members.map((member) => <Avatar key={member.id} initials={member.initials} avatarUrl={member.avatarUrl} className="avatar--recent-member" />)}</div>}
    <p><strong>{total.toLocaleString()} {total === 1 ? 'person is' : 'people are'} already here.</strong><span>{members.length ? `${members.slice(0, 2).map((member) => member.name.split(' ')[0]).join(' and ')} recently joined.` : 'Be one of the first to show up.'}</span></p>
  </div>
}
