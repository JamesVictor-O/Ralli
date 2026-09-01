import { DareCard, type Dare } from './DareCard.tsx'

const rallis: Dare[] = [
  {
    id: 'desk', author: 'Nia', initials: 'NK', time: '8 min',
    prompt: 'Show us the weirdest thing on your desk.', category: 'Just for fun',
    participants: 84, reactions: 192, reward: 12,
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'A creative desk filled with stationery and small objects', tone: 'coral',
  },
  {
    id: 'sky', author: 'Milo', initials: 'MO', time: '23 min',
    prompt: 'Take a picture of the sky where you are right now.', category: 'Around the world',
    participants: 341, reactions: 628, reward: 24,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'A dramatic pastel sky over a distant landscape', tone: 'violet',
  },
]

export function DareFeed({ onOpen, onJoin, onBoost }: { onOpen: () => void; onJoin: () => void; onBoost: (ralli: Dare) => void }) {
  return <section className="dare-feed" aria-label="Rallis for you">{rallis.map((ralli) => <DareCard dare={ralli} key={ralli.id} onOpen={onOpen} onJoin={onJoin} onBoost={() => onBoost(ralli)} />)}</section>
}
