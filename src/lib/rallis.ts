import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import type { Dare } from '../features/discover/DareCard.tsx'
import type { RalliFeedRow } from '../types/database.ts'
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

export async function fetchRalliFeed() {
  const { data, error } = await requireSupabase()
    .from('ralli_feed')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) throw error
  return (data ?? []).map(mapFeedRow)
}
