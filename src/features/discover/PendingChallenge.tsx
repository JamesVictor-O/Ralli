import { useCallback, useEffect, useState } from 'react'
import { ArrowRight, LoaderCircle, Repeat2 } from 'lucide-react'
import { useBackend } from '../../store/backend.ts'
import { fetchPendingChallenge } from '../../lib/invitations.ts'
import type { Dare } from './DareCard.tsx'

type PendingChallengeData = Awaited<ReturnType<typeof fetchPendingChallenge>>

export function PendingChallenge({ refreshKey = 0, onJoin }: { refreshKey?: number; onJoin: (ralli: Dare) => void }) {
  const { status: backendStatus, user } = useBackend()
  const [challenge, setChallenge] = useState<PendingChallengeData>(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    void refreshKey
    if (backendStatus !== 'ready' || !user) return setChallenge(null)
    setLoading(true)
    try { setChallenge(await fetchPendingChallenge(user.id)) }
    catch { setChallenge(null) }
    finally { setLoading(false) }
  }, [backendStatus, user, refreshKey])

  useEffect(() => { void Promise.resolve().then(load) }, [load])

  if (loading && !challenge) return <div className="next-move next-move--loading" aria-label="Checking for challenges" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /></div>
  if (!challenge) return null

  return (
    <section className="next-move" aria-labelledby="next-move-title">
      <span className="next-move__icon"><Repeat2 aria-hidden="true" /></span>
      <div><p className="eyebrow">Your next move</p><h2 id="next-move-title">{challenge.senderName} challenged you.</h2><p>{challenge.ralli.prompt}</p></div>
      <button className="button button--ink" type="button" onClick={() => onJoin(challenge.ralli)}>Respond now <ArrowRight aria-hidden="true" /></button>
    </section>
  )
}
