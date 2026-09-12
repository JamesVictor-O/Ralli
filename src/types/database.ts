export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

type ProfileRow = {
  id: string
  handle: string | null
  display_name: string
  bio: string
  avatar_path: string | null
  nimiq_address: string | null
  nimiq_address_verified_at: string | null
  onboarded_at: string | null
  created_at: string
  updated_at: string
}

type RalliRow = {
  id: string
  creator_id: string
  prompt: string
  description: string
  category: string
  response_formats: Database['public']['Enums']['response_format'][]
  cover_path: string | null
  status: Database['public']['Enums']['ralli_status']
  reward_total_luna: number
  starts_at: string
  ends_at: string
  winner_response_id: string | null
  community_id: string | null
  created_at: string
  updated_at: string
}

type ResponseRow = {
  id: string
  ralli_id: string
  author_id: string
  format: Database['public']['Enums']['response_format']
  text_content: string | null
  media_path: string | null
  media_poster_path: string | null
  status: Database['public']['Enums']['response_status']
  city: string | null
  country: string | null
  flag: string | null
  created_at: string
  updated_at: string
}

type ReactionRow = { id: string; response_id: string; user_id: string; kind: string; created_at: string }
type RalliPassRow = { id: string; ralli_id: string; response_id: string | null; passed_by: string; passed_to: string | null; share_code: string; created_at: string }
type PoolContributionRow = { id: string; ralli_id: string; contributor_id: string; kind: Database['public']['Enums']['contribution_kind']; amount_luna: number; transaction_hash: string | null; status: Database['public']['Enums']['transaction_status']; confirmed_at: string | null; created_at: string }
type ResponseTipRow = { id: string; response_id: string; sender_id: string; recipient_id: string; amount_luna: number; transaction_hash: string | null; status: Database['public']['Enums']['transaction_status']; confirmed_at: string | null; created_at: string }
type ActivityEventRow = { id: string; user_id: string; actor_id: string | null; ralli_id: string | null; response_id: string | null; kind: string; payload: Json; read_at: string | null; created_at: string }
type ContentReportRow = { id: string; reporter_id: string; response_id: string; reason: Database['public']['Enums']['report_reason']; details: string; status: string; created_at: string }
type UserBlockRow = { blocker_id: string; blocked_id: string; created_at: string }
type RalliInvitationRow = { id: string; token: string; ralli_id: string; response_id: string | null; sender_id: string; recipient_id: string | null; status: Database['public']['Enums']['invitation_status']; opened_at: string | null; accepted_at: string | null; responded_at: string | null; created_at: string }
type CommunityRow = { id: string; slug: string; name: string; icon: string; description: string; created_by: string | null; created_at: string; updated_at: string }
type CommunityMemberRow = { community_id: string; user_id: string; role: Database['public']['Enums']['community_role']; joined_at: string }
type CommunityDailyRalliRow = { community_id: string; ralli_id: string; active_date: string; created_at: string }
type ProductEventRow = { id: number; user_id: string; session_id: string; event_name: string; source: string | null; ralli_id: string | null; response_id: string | null; community_id: string | null; properties: Json; created_at: string }

export type CommunityDirectoryRow = {
  id: string | null
  slug: string | null
  name: string | null
  icon: string | null
  description: string | null
  created_at: string | null
  member_count: number | null
  ralli_count: number | null
  response_count: number | null
  reaction_count: number | null
  pass_count: number | null
  boost_total_luna: number | null
}

export type RalliFeedRow = {
  id: string | null
  creator_id: string | null
  handle: string | null
  display_name: string | null
  avatar_path: string | null
  prompt: string | null
  description: string | null
  category: string | null
  cover_path: string | null
  status: Database['public']['Enums']['ralli_status'] | null
  reward_total_luna: number | null
  creator_reward_luna: number | null
  boost_total_luna: number | null
  ends_at: string | null
  created_at: string | null
  response_count: number | null
  reaction_count: number | null
  pass_count: number | null
  boost_count: number | null
  community_id: string | null
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow
        Insert: Partial<Omit<ProfileRow, 'id'>> & { id: string }
        Update: Partial<Omit<ProfileRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      rallis: {
        Row: RalliRow
        Insert: Partial<Omit<RalliRow, 'creator_id' | 'prompt' | 'ends_at'>> & {
          creator_id: string
          prompt: string
          ends_at: string
        }
        Update: Partial<Omit<RalliRow, 'id' | 'creator_id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      responses: {
        Row: ResponseRow
        Insert: Partial<Omit<ResponseRow, 'id' | 'ralli_id' | 'author_id' | 'format'>> & {
          ralli_id: string
          author_id: string
          format: Database['public']['Enums']['response_format']
        }
        Update: Partial<Omit<ResponseRow, 'id' | 'ralli_id' | 'author_id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      reactions: {
        Row: ReactionRow
        Insert: Omit<ReactionRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      ralli_passes: {
        Row: RalliPassRow
        Insert: Partial<Pick<RalliPassRow, 'response_id' | 'passed_to'>> & Pick<RalliPassRow, 'ralli_id' | 'passed_by'>
        Update: never
        Relationships: []
      }
      pool_contributions: {
        Row: PoolContributionRow
        Insert: never
        Update: never
        Relationships: []
      }
      response_tips: {
        Row: ResponseTipRow
        Insert: never
        Update: never
        Relationships: []
      }
      activity_events: {
        Row: ActivityEventRow
        Insert: never
        Update: Pick<ActivityEventRow, 'read_at'>
        Relationships: []
      }
      content_reports: {
        Row: ContentReportRow
        Insert: Pick<ContentReportRow, 'reporter_id' | 'response_id' | 'reason'> & Partial<Pick<ContentReportRow, 'details'>>
        Update: never
        Relationships: []
      }
      user_blocks: { Row: UserBlockRow; Insert: Pick<UserBlockRow, 'blocker_id' | 'blocked_id'>; Update: never; Relationships: [] }
      ralli_invitations: { Row: RalliInvitationRow; Insert: never; Update: never; Relationships: [] }
      communities: {
        Row: CommunityRow
        Insert: Partial<Omit<CommunityRow, 'name' | 'slug' | 'description'>> & Pick<CommunityRow, 'name' | 'slug' | 'description'>
        Update: Partial<Omit<CommunityRow, 'id' | 'created_at'>>
        Relationships: []
      }
      community_members: {
        Row: CommunityMemberRow
        Insert: Pick<CommunityMemberRow, 'community_id' | 'user_id'> & Partial<Pick<CommunityMemberRow, 'role'>>
        Update: never
        Relationships: []
      }
      community_daily_rallis: {
        Row: CommunityDailyRalliRow
        Insert: Pick<CommunityDailyRalliRow, 'community_id' | 'ralli_id'> & Partial<Pick<CommunityDailyRalliRow, 'active_date'>>
        Update: Pick<CommunityDailyRalliRow, 'ralli_id'>
        Relationships: []
      }
      product_events: {
        Row: ProductEventRow
        Insert: Omit<ProductEventRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
    }
    Views: {
      ralli_feed: {
        Row: RalliFeedRow
        Relationships: []
      }
      community_directory: { Row: CommunityDirectoryRow; Relationships: [] }
    }
    Functions: {
      has_verified_nimiq_address: {
        Args: { profile_id: string }
        Returns: boolean
      }
      complete_wallet_verification: {
        Args: { challenge_id: string; profile_id: string; verified_address: string }
        Returns: undefined
      }
      remove_my_ralli: { Args: { ralli_id: string }; Returns: string }
      create_ralli_invitation: { Args: { target_ralli: string; source_response: string | null }; Returns: string }
      open_ralli_invitation: { Args: { invite_token: string }; Returns: Array<{ ralli_id: string; prompt: string; sender_name: string; status: Database['public']['Enums']['invitation_status'] }> }
      accept_ralli_invitation: { Args: { invite_token: string }; Returns: string }
    }
    Enums: {
      ralli_status: 'draft' | 'active' | 'judging' | 'settled' | 'cancelled'
      response_format: 'text' | 'photo' | 'video'
      response_status: 'published' | 'hidden' | 'winner'
      contribution_kind: 'creator_reward' | 'boost'
      transaction_status: 'pending' | 'confirmed' | 'failed' | 'refunded'
      settlement_status: 'pending' | 'paying' | 'paid' | 'failed' | 'refunded'
      report_reason: 'spam' | 'harassment' | 'unsafe' | 'copyright' | 'other'
      invitation_status: 'shared' | 'opened' | 'accepted' | 'responded'
      community_role: 'member' | 'moderator' | 'owner'
    }
    CompositeTypes: Record<never, never>
  }
}
