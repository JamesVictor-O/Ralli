import { LUNA_PER_NIM } from '../nimiq/payments.ts'
import type { Dare } from '../features/discover/DareCard.tsx'
import type { CommunityDirectoryRow, RalliFeedRow } from '../types/database.ts'
import { publicAvatarUrl, publicMediaUrl } from './media.ts'
import { mapFeedRow } from './rallis.ts'
import { requireSupabase } from './supabase.ts'

export interface Community {
  id: string
  slug: string
  name: string
  icon: string
  description: string
  members: number
  rallis: number
  responses: number
  reactions: number
  passes: number
  boosted: number
  joined: boolean
}

export interface CommunityMember {
  id: string
  name: string
  initials: string
  avatarUrl: string | null
  role: 'member' | 'moderator' | 'owner'
}

export interface CommunityResponse {
  id: string
  ralli: Dare
  author: string
  initials: string
  avatarUrl: string | null
  copy: string
  mediaUrl: string | null
  format: 'photo' | 'video' | 'text'
  reactions: number
}

export interface CommunityChain {
  ralli: Dare
  people: number
  locations: string[]
}

export interface CommunityDetailData {
  community: Community
  daily: Dare | null
  happening: Dare[]
  chains: CommunityChain[]
  responses: CommunityResponse[]
  members: CommunityMember[]
}

function initials(value: string) {
  return value.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

function mapCommunity(row: CommunityDirectoryRow, joined: boolean): Community {
  return {
    id: row.id ?? '',
    slug: row.slug ?? '',
    name: row.name ?? 'Community',
    icon: row.icon ?? '🎉',
    description: row.description ?? '',
    members: row.member_count ?? 0,
    rallis: row.ralli_count ?? 0,
    responses: row.response_count ?? 0,
    reactions: row.reaction_count ?? 0,
    passes: row.pass_count ?? 0,
    boosted: Number(row.boost_total_luna ?? 0) / LUNA_PER_NIM,
    joined,
  }
}

export async function fetchCommunities(userId?: string | null): Promise<Community[]> {
  const database = requireSupabase()
  const [directoryResult, membershipResult] = await Promise.all([
    database.from('community_directory').select('*'),
    userId
      ? database.from('community_members').select('community_id').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (directoryResult.error) throw directoryResult.error
  if (membershipResult.error) throw membershipResult.error
  const joined = new Set((membershipResult.data ?? []).map((item) => item.community_id))
  return (directoryResult.data ?? [])
    .map((row) => mapCommunity(row, joined.has(row.id ?? '')))
    .sort((a, b) => Number(b.joined) - Number(a.joined) || (b.responses + b.passes) - (a.responses + a.passes) || a.name.localeCompare(b.name))
}

export async function setCommunityMembership(communityId: string, userId: string, join: boolean) {
  const database = requireSupabase()
  const request = join
    ? database.from('community_members').insert({ community_id: communityId, user_id: userId })
    : database.from('community_members').delete().eq('community_id', communityId).eq('user_id', userId)
  const { error } = await request
  if (error?.code === '23505' && join) return
  if (error) throw error
}

export async function fetchCommunityDetail(slug: string, userId?: string | null): Promise<CommunityDetailData> {
  const database = requireSupabase()
  const [communityResult, membershipResult] = await Promise.all([
    database.from('community_directory').select('*').eq('slug', slug).single(),
    userId
      ? database.from('community_members').select('community_id').eq('user_id', userId)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (communityResult.error) throw communityResult.error
  if (membershipResult.error) throw membershipResult.error
  const community = mapCommunity(
    communityResult.data,
    (membershipResult.data ?? []).some((item) => item.community_id === communityResult.data.id),
  )

  const today = new Date().toISOString().slice(0, 10)
  const [rallisResult, dailyResult, membersResult] = await Promise.all([
    database.from('ralli_feed').select('*').eq('community_id', community.id).eq('status', 'active')
      .gt('ends_at', new Date().toISOString()).order('created_at', { ascending: false }).limit(30),
    database.from('community_daily_rallis').select('ralli_id').eq('community_id', community.id).eq('active_date', today).maybeSingle(),
    database.from('community_members').select('*').eq('community_id', community.id).order('joined_at', { ascending: true }).limit(18),
  ])
  if (rallisResult.error) throw rallisResult.error
  if (dailyResult.error) throw dailyResult.error
  if (membersResult.error) throw membersResult.error

  const ralliRows = (rallisResult.data ?? []) as RalliFeedRow[]
  const rallis = ralliRows.map(mapFeedRow)
  const ralliById = new Map(rallis.map((ralli) => [ralli.id, ralli]))
  const ralliIds = rallis.map((ralli) => ralli.id)

  const responseRequest = ralliIds.length
    ? database.from('responses').select('*').in('ralli_id', ralliIds).neq('status', 'hidden').order('created_at', { ascending: false }).limit(24)
    : Promise.resolve({ data: [], error: null })
  const passRequest = ralliIds.length
    ? database.from('ralli_passes').select('*').in('ralli_id', ralliIds).order('created_at', { ascending: true }).limit(500)
    : Promise.resolve({ data: [], error: null })
  const memberIds = (membersResult.data ?? []).map((member) => member.user_id)
  const memberProfilesRequest = memberIds.length
    ? database.from('profiles').select('id, display_name, handle, avatar_path').in('id', memberIds)
    : Promise.resolve({ data: [], error: null })

  const [responsesResult, passesResult, memberProfilesResult] = await Promise.all([responseRequest, passRequest, memberProfilesRequest])
  if (responsesResult.error) throw responsesResult.error
  if (passesResult.error) throw passesResult.error
  if (memberProfilesResult.error) throw memberProfilesResult.error

  const responseRows = responsesResult.data ?? []
  const responseIds = responseRows.map((response) => response.id)
  const authorIds = [...new Set(responseRows.map((response) => response.author_id))]
  const [responseProfilesResult, reactionsResult] = await Promise.all([
    authorIds.length
      ? database.from('profiles').select('id, display_name, handle, avatar_path').in('id', authorIds)
      : Promise.resolve({ data: [], error: null }),
    responseIds.length
      ? database.from('reactions').select('response_id').in('response_id', responseIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (responseProfilesResult.error) throw responseProfilesResult.error
  if (reactionsResult.error) throw reactionsResult.error

  const responseProfiles = new Map((responseProfilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const reactionCounts = new Map<string, number>()
  for (const reaction of reactionsResult.data ?? []) reactionCounts.set(reaction.response_id, (reactionCounts.get(reaction.response_id) ?? 0) + 1)
  const responses: CommunityResponse[] = responseRows.map((response) => {
    const profile = responseProfiles.get(response.author_id)
    const author = profile?.display_name || profile?.handle || 'Ralli member'
    return {
      id: response.id,
      ralli: ralliById.get(response.ralli_id)!,
      author,
      initials: initials(author),
      avatarUrl: publicAvatarUrl(profile?.avatar_path ?? null),
      copy: response.text_content || '',
      mediaUrl: publicMediaUrl(response.media_path),
      format: response.format,
      reactions: reactionCounts.get(response.id) ?? 0,
    }
  }).filter((response) => Boolean(response.ralli))

  const passesByRalli = new Map<string, number>()
  for (const pass of passesResult.data ?? []) passesByRalli.set(pass.ralli_id, (passesByRalli.get(pass.ralli_id) ?? 0) + 1)
  const locationsByRalli = new Map<string, string[]>()
  for (const response of responseRows) {
    if (!response.city) continue
    const locations = locationsByRalli.get(response.ralli_id) ?? []
    const place = `${response.city}${response.flag ? ` ${response.flag}` : ''}`
    if (!locations.includes(place)) locations.push(place)
    locationsByRalli.set(response.ralli_id, locations)
  }
  const chains = rallis
    .filter((ralli) => (passesByRalli.get(ralli.id) ?? 0) > 0)
    .map((ralli) => ({ ralli, people: (passesByRalli.get(ralli.id) ?? 0) + 1, locations: locationsByRalli.get(ralli.id) ?? [] }))
    .sort((a, b) => b.people - a.people)
    .slice(0, 4)

  const memberProfiles = new Map((memberProfilesResult.data ?? []).map((profile) => [profile.id, profile]))
  const members: CommunityMember[] = (membersResult.data ?? []).map((member) => {
    const profile = memberProfiles.get(member.user_id)
    const name = profile?.display_name || profile?.handle || 'Ralli member'
    return { id: member.user_id, name, initials: initials(name), avatarUrl: publicAvatarUrl(profile?.avatar_path ?? null), role: member.role }
  })

  const happening = [...rallis].sort((a, b) =>
    (b.participants * 4 + b.reactions + b.passes * 2 + b.boosts) - (a.participants * 4 + a.reactions + a.passes * 2 + a.boosts),
  )
  const explicitDaily = dailyResult.data?.ralli_id ? ralliById.get(dailyResult.data.ralli_id) : null
  return { community, daily: explicitDaily ?? happening[0] ?? null, happening: happening.filter((ralli) => ralli.id !== (explicitDaily ?? happening[0])?.id).slice(0, 5), chains, responses, members }
}
