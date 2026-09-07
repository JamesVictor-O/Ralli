import { useCallback, useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { publicAvatarUrl } from '../lib/media.ts'
import { fetchProfileSummary } from '../lib/profile.ts'

export interface ProfileSummary {
  displayName: string
  initials: string
  handle: string | null
  avatarUrl: string | null
  onboarded: boolean
}

function initialsFrom(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'RA'
}

export function useMyProfileSummary(user: User | null) {
  const [summary, setSummary] = useState<ProfileSummary | null>(null)

  const refresh = useCallback(async () => {
    if (!user) {
      setSummary(null)
      return
    }
    try {
      const row = await fetchProfileSummary(user.id)
      setSummary({
        displayName: row.display_name,
        initials: initialsFrom(row.display_name),
        handle: row.handle,
        avatarUrl: publicAvatarUrl(row.avatar_path),
        onboarded: Boolean(row.onboarded_at),
      })
    } catch {
      setSummary(null)
    }
  }, [user])

  useEffect(() => {
    void Promise.resolve().then(refresh)
  }, [refresh])

  return { summary, refresh }
}
