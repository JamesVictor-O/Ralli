import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import type { Dare } from '../features/discover/DareCard.tsx'
import type { RalliFeedRow } from '../types/database.ts'
import { publicAvatarUrl } from './media.ts'
import { requireSupabase } from './supabase.ts'

const fallbackCovers = [
  'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1200&q=85',
  'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85',
]

function relativeTime(value: string | null) {
  if (!value) return 'now'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60_000))
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hr`
  return `${Math.floor(hours / 24)} day`
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

function mediaUrl(path: string | null, index: number) {
  if (!path) return fallbackCovers[index % fallbackCovers.length]
  if (/^https?:\/\//.test(path)) return path
  return requireSupabase().storage.from('ralli-media').getPublicUrl(path).data.publicUrl
}

function toNim(luna: number | null) {
  return Math.max(0, Number(luna ?? 0) / LUNA_PER_NIM)
}

export function mapFeedRow(row: RalliFeedRow, index = 0): Dare {
  const author = row.display_name || row.handle || 'Ralli creator'
  const starterReward = toNim(row.creator_reward_luna)
  const boosts = toNim(row.boost_total_luna)
  return {
    id: row.id ?? `ralli-${index}`,
    author,
    initials: initials(author),
    authorAvatarUrl: publicAvatarUrl(row.avatar_path),
    time: relativeTime(row.created_at),
    prompt: row.prompt || 'Untitled Ralli',
    category: row.category || 'Just for fun',
    participants: row.response_count ?? 0,
    reactions: row.reaction_count ?? 0,
    passes: row.pass_count ?? 0,
    // The crowdfunded total is what's actually behind a Ralli — rallis.reward_total_luna
    // stays 0 forever by design (see the "Verified users create unfunded Rallis" policy).
    reward: starterReward + boosts,
    starterReward,
    boosts,
    boostCount: row.boost_count ?? 0,
    image: mediaUrl(row.cover_path, index),
    imageAlt: row.prompt ? `Cover for ${row.prompt}` : 'Ralli cover',
    tone: index % 2 === 0 ? 'coral' : 'violet',
    description: row.description || '',
    endsAt: row.ends_at || undefined,
    creatorId: row.creator_id || undefined,
  }
}

export async function fetchRalliById(id: string) {
  const { data, error } = await requireSupabase().from('ralli_feed').select('*').eq('id', id).single()
  if (error) throw error
  return mapFeedRow(data)
}

// The single global prompt every session opens on. There's no curated "prompt of the
// day" table — anyone can still start a Ralli anytime — so "today's" is whichever active
// Ralli is pulling the most responses in the last 24h, falling back to the newest overall
// once the platform has been quiet that long.
export async function fetchTodaysRalli(): Promise<Dare | null> {
  const database = requireSupabase()
  // Nothing flips a Ralli's status when its clock runs out — ends_at is just a
  // timestamp — so both queries have to exclude expired rows themselves. Run in
  // parallel rather than falling back sequentially — that was the main source of
  // this call's latency (a second round trip that fires almost every time, since
  // there's rarely a Ralli active in the last 24h).
  const now = new Date().toISOString()
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const [recent, fallback] = await Promise.all([
    database.from('ralli_feed').select('*').eq('status', 'active')
      .gt('ends_at', now)
      .gte('created_at', cutoff).order('response_count', { ascending: false }).order('created_at', { ascending: false }).limit(1),
    database.from('ralli_feed').select('*').eq('status', 'active')
      .gt('ends_at', now)
      .order('created_at', { ascending: false }).limit(1),
  ])
  if (recent.error) throw recent.error
  if (recent.data?.[0]) return mapFeedRow(recent.data[0])
  if (fallback.error) throw fallback.error
  return fallback.data?.[0] ? mapFeedRow(fallback.data[0]) : null
}

export interface RalliPresence {
  cities: { city: string; flag: string; count: number }[]
  moreCount: number
}

// Powers the "Lagos 🇳🇬 · Berlin 🇩🇪 +47" pills — real cities pulled from responses that
// carried geo data (see src/lib/geo.ts), never fabricated. Rallis with no geo-tagged
// responses yet (older data, or geo lookup failed) just show no pills.
export async function fetchRalliPresence(ralliId: string): Promise<RalliPresence> {
  const { data, error } = await requireSupabase().from('responses').select('city, flag')
    .eq('ralli_id', ralliId).not('city', 'is', null).limit(1000)
  if (error) throw error

  const counts = new Map<string, { city: string; flag: string; count: number }>()
  for (const row of data ?? []) {
    if (!row.city) continue
    const existing = counts.get(row.city)
    if (existing) existing.count += 1
    else counts.set(row.city, { city: row.city, flag: row.flag || '', count: 1 })
  }
  const sorted = [...counts.values()].sort((a, b) => b.count - a.count)
  return { cities: sorted.slice(0, 4), moreCount: Math.max(0, sorted.length - 4) }
}

export async function fetchRalliFeed() {
  const { data, error } = await requireSupabase()
    .from('ralli_feed')
    .select('*')
    .eq('status', 'active')
    .gt('ends_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return (data ?? []).map(mapFeedRow)
}
