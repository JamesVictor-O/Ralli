import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Image, LoaderCircle, RefreshCw, Sparkles, UsersRound } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { optimizeAvatarImage, uploadAvatar } from '../../lib/media.ts'
import { updateMyProfile } from '../../lib/profile.ts'
import { fetchCommunities, setCommunityMembership, type Community } from '../../lib/communities.ts'
import { trackProductEvent } from '../../lib/analytics.ts'
import { actionableError } from '../../lib/errors.ts'
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock.ts'

function initialsFrom(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '🙂'
}

export function Onboarding({ userId, onDone }: { userId: string; onDone: (communitySlug?: string) => void }) {
  const [step, setStep] = useState<'interests' | 'identity'>('interests')
  const [communities, setCommunities] = useState<Community[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [communityStatus, setCommunityStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'skipping'>('idle')
  const [error, setError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useBodyScrollLock()
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

  const loadCommunities = useCallback(async () => {
    setCommunityStatus('loading')
    setError('')
    try {
      const available = await fetchCommunities(userId)
      setCommunities(available)
      setSelectedIds(available.filter((community) => community.joined).map((community) => community.id).slice(0, 3))
      setCommunityStatus('ready')
    } catch (failure) {
      setError(actionableError(failure, 'Ralli could not load your communities.'))
      setCommunityStatus('error')
    }
  }, [userId])

  useEffect(() => { void Promise.resolve().then(loadCommunities) }, [loadCommunities])

  function toggleCommunity(id: string) {
    setError('')
    if (selectedIds.includes(id)) return setSelectedIds(selectedIds.filter((item) => item !== id))
    if (selectedIds.length >= 3) return setError('Choose up to three communities for now. You can join more later.')
    setSelectedIds([...selectedIds, id])
  }

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  async function skip() {
    setSaving('skipping')
    setError('')
    try {
      await updateMyProfile(userId, { markOnboarded: true })
      onDone()
    } catch (failure) {
      setError(actionableError(failure, 'Ralli could not finish setup. Try again.'))
      setSaving('idle')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!displayName.trim()) return setError('Add a name so your community knows who showed up.')
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return setError('Usernames use lowercase letters, numbers, and _ (3-24 characters).')
    setSaving('saving')
    setError('')
    try {
      const avatarPath = avatarFile ? await uploadAvatar(userId, await optimizeAvatarImage(avatarFile)) : undefined
      await updateMyProfile(userId, { displayName, handle: handle || null, ...(avatarPath ? { avatarPath } : {}) })
      const selected = communities.filter((community) => selectedIds.includes(community.id))
      await Promise.all(selected.filter((community) => !community.joined).map(async (community) => {
        await setCommunityMembership(community.id, userId, true)
        trackProductEvent('community_joined', { userId, communityId: community.id, source: 'onboarding' })
      }))
      await updateMyProfile(userId, { markOnboarded: true })
      onDone(selected[0]?.slug)
    } catch (failure) {
      setError(actionableError(failure, 'Your Ralli setup could not be saved. Your choices are still here—try again.'))
      setSaving('idle')
    }
  }

  const selectedCommunity = communities.find((community) => community.id === selectedIds[0])

  return (
    <div className="wallet-backdrop onboarding-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className="payment-panel onboarding-panel">
        <header className="onboarding-header">
          {step === 'identity' && <button className="icon-button" type="button" aria-label="Back to interests" onClick={() => { setStep('interests'); setError('') }}><ArrowLeft aria-hidden="true" /></button>}
          <div><p className="eyebrow">Welcome to Ralli · {step === 'interests' ? '1 of 2' : '2 of 2'}</p><h2 id="onboarding-title">{step === 'interests' ? 'What are you into?' : 'Who’s showing up?'}</h2></div>
        </header>

        {step === 'interests' ? <div className="onboarding-interests">
          <p className="onboarding-intro">Choose up to three places where you want to participate. We’ll take you straight to something worth doing.</p>
          {communityStatus === 'loading' && <div className="onboarding-community-state" aria-busy="true"><LoaderCircle className="spin" aria-hidden="true" /><strong>Finding your people…</strong></div>}
          {communityStatus === 'error' && <div className="onboarding-community-state" role="alert"><RefreshCw aria-hidden="true" /><strong>Communities didn’t load</strong><p>{error}</p><button className="button button--soft" type="button" onClick={() => void loadCommunities()}>Try again</button></div>}
          {communityStatus === 'ready' && communities.length === 0 && <div className="onboarding-community-state"><UsersRound aria-hidden="true" /><strong>Your first community is still forming.</strong><p>You can continue and discover public Rallis instead.</p></div>}
          {communityStatus === 'ready' && communities.length > 0 && <fieldset className="onboarding-community-grid"><legend className="sr-only">Choose your communities</legend>{communities.map((community) => {
            const selected = selectedIds.includes(community.id)
            return <button className={selected ? 'is-selected' : ''} type="button" aria-pressed={selected} key={community.id} onClick={() => toggleCommunity(community.id)}><span aria-hidden="true">{community.icon}</span><span><strong>{community.name}</strong><small>{community.description}</small></span><i>{selected ? <Check aria-hidden="true" /> : <UsersRound aria-hidden="true" />}</i></button>
          })}</fieldset>}
          {error && communityStatus === 'ready' && <p className="payment-error" role="alert">{error}</p>}
          <div className="onboarding-actions"><button className="button button--soft" type="button" disabled={saving !== 'idle'} onClick={() => void skip()}>{saving === 'skipping' ? 'Skipping…' : 'Explore first'}</button><button className="button button--ink" type="button" disabled={communityStatus !== 'ready' || (communities.length > 0 && selectedIds.length === 0)} onClick={() => { setStep('identity'); setError('') }}>Continue <ArrowRight aria-hidden="true" /></button></div>
        </div> : <form className="payment-form" onSubmit={save}>
          <p className="onboarding-intro">This is how people recognize you when you respond, compete, and keep a chain moving.</p>
          <input className="sr-only" ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
          <button className="avatar-picker" type="button" onClick={() => avatarInputRef.current?.click()}><Avatar initials={initialsFrom(displayName)} avatarUrl={avatarPreview} className="avatar-picker__preview" /><span><Image aria-hidden="true" />{avatarFile ? 'Change photo' : 'Add a photo'}</span></button>
          <div className="field"><label htmlFor="onboarding-name">Your name</label><input id="onboarding-name" type="text" autoComplete="name" maxLength={60} placeholder="Add your name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
          <div className="field"><label htmlFor="onboarding-handle">Username <span>Optional</span></label><div className="input-with-icon"><strong>@</strong><input id="onboarding-handle" type="text" autoComplete="username" maxLength={24} placeholder="yourname" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></div></div>
          <aside className="onboarding-destination"><Sparkles aria-hidden="true" /><span><strong>Something is waiting for you.</strong><small>After setup, we’ll open {selectedCommunity?.name || 'Discover'} so you can join your first Ralli.</small></span></aside>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <div className="onboarding-actions"><button className="button button--soft" type="button" disabled={saving !== 'idle'} onClick={() => setStep('interests')}>Back</button><button className="button button--ink" type="submit" disabled={saving !== 'idle'} aria-busy={saving === 'saving'}>{saving === 'saving' && <LoaderCircle className="spin" aria-hidden="true" />}{saving === 'saving' ? 'Joining your communities…' : <>Enter Ralli <ArrowRight aria-hidden="true" /></>}</button></div>
        </form>}
      </section>
    </div>
  )
}
