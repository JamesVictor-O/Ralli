import type { Json } from '../types/database.ts'
import { supabase } from './supabase.ts'

export type ProductEventName =
  | 'app_opened'
  | 'ralli_opened'
  | 'response_started'
  | 'response_published'
  | 'responses_viewed'
  | 'invitation_shared'
  | 'invitation_opened'
  | 'invitation_accepted'
  | 'community_opened'
  | 'community_joined'

export interface ProductEventContext {
  userId: string
  source?: string
  ralliId?: string
  responseId?: string
  communityId?: string
  properties?: Record<string, Json | undefined>
}

const sessionKey = 'ralli-product-session'

function sessionId() {
  const existing = window.sessionStorage.getItem(sessionKey)
  if (existing) return existing
  const created = crypto.randomUUID()
  window.sessionStorage.setItem(sessionKey, created)
  return created
}

/** Analytics must never block or break a social action. */
export function trackProductEvent(eventName: ProductEventName, context: ProductEventContext) {
  if (!supabase) return
  void supabase.from('product_events').insert({
    user_id: context.userId,
    session_id: sessionId(),
    event_name: eventName,
    source: context.source?.slice(0, 40) ?? null,
    ralli_id: context.ralliId ?? null,
    response_id: context.responseId ?? null,
    community_id: context.communityId ?? null,
    properties: context.properties ?? {},
  }).then(({ error }) => {
    if (error && import.meta.env.DEV) console.warn('Ralli analytics event was not recorded.', error.message)
  })
}
