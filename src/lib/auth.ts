import type { User } from '@supabase/supabase-js'
import { requireSupabase } from './supabase.ts'

export async function ensureAnonymousSession(): Promise<User> {
  const client = requireSupabase()
  const { data: sessionData, error: sessionError } = await client.auth.getSession()
  if (sessionError) throw sessionError
  if (sessionData.session?.user) return sessionData.session.user

  const { data, error } = await client.auth.signInAnonymously({
    options: { data: { source: 'nimiq-pay-mini-app' } },
  })
  if (error) throw error
  if (!data.user) throw new Error('Supabase did not return a user for the anonymous session.')
  return data.user
}
