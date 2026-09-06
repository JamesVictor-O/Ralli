import type { Dare } from './DareCard.tsx'

export const demoRallis: Dare[] = [
  {
    id: 'desk', author: 'Nia', initials: 'NK', time: '8 min',
    prompt: 'Show us the weirdest thing on your desk.', category: 'Just for fun',
    participants: 84, reactions: 192, passes: 17, reward: 12, starterReward: 5, boosts: 7, boostCount: 4,
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'A creative desk filled with stationery and small objects', tone: 'coral',
  },
  {
    id: 'sky', author: 'Milo', initials: 'MO', time: '23 min',
    prompt: 'Take a picture of the sky where you are right now.', category: 'Around the world',
    participants: 341, reactions: 628, passes: 46, reward: 24, starterReward: 10, boosts: 14, boostCount: 9,
    image: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
    imageAlt: 'A dramatic pastel sky over a distant landscape', tone: 'violet',
  },
]
