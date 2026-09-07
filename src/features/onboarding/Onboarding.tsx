import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { Image, LoaderCircle, Sparkles } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { optimizeAvatarImage, uploadAvatar } from '../../lib/media.ts'
import { updateMyProfile } from '../../lib/profile.ts'

function initialsFrom(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '🙂'
}

export function Onboarding({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [displayName, setDisplayName] = useState('')
  const [handle, setHandle] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState<'idle' | 'saving' | 'skipping'>('idle')
  const [error, setError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

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
    try {
      await updateMyProfile(userId, { markOnboarded: true })
      onDone()
    } catch {
      // If this fails the sheet just stays put — harmless, they can try again or dismiss later.
      setSaving('idle')
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!displayName.trim()) return setError('Add a name so people know who started or joined a Ralli.')
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return setError('Usernames use lowercase letters, numbers, and _ (3-24 characters).')
    setSaving('saving')
    setError('')
    try {
      const avatarPath = avatarFile ? await uploadAvatar(userId, await optimizeAvatarImage(avatarFile)) : undefined
      await updateMyProfile(userId, { displayName, handle: handle || null, markOnboarded: true, ...(avatarPath ? { avatarPath } : {}) })
      onDone()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your profile could not be saved.')
      setSaving('idle')
    }
  }

  return (
    <div className="wallet-backdrop" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
      <section className="payment-panel">
        <header className="wallet-panel__header">
          <div><p className="eyebrow">Welcome to Ralli</p><h2 id="onboarding-title">Set up your identity</h2></div>
        </header>
        <form className="payment-form" onSubmit={save}>
          <p className="onboarding-intro">This is what other people see when you start, join, or tip a Ralli.</p>
          <input className="sr-only" ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
          <button className="avatar-picker" type="button" onClick={() => avatarInputRef.current?.click()}>
            <Avatar initials={initialsFrom(displayName)} avatarUrl={avatarPreview} className="avatar-picker__preview" />
            <span><Image aria-hidden="true" />{avatarFile ? 'Change photo' : 'Add a photo'}</span>
          </button>
          <div className="field">
            <label htmlFor="onboarding-name">Your name</label>
            <input id="onboarding-name" type="text" autoComplete="name" maxLength={60} placeholder="Add your name"
              value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="onboarding-handle">Username <span>Optional</span></label>
            <div className="input-with-icon"><strong>@</strong><input id="onboarding-handle" type="text" autoComplete="off" maxLength={24} placeholder="yourname"
              value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></div>
          </div>
          {error && <p className="payment-error" role="alert">{error}</p>}
          <div className="onboarding-actions">
            <button className="button button--soft" type="button" disabled={saving !== 'idle'} onClick={() => void skip()}>
              {saving === 'skipping' ? 'Skipping…' : 'Skip for now'}
            </button>
            <button className="button button--ink" type="submit" disabled={saving !== 'idle'} aria-busy={saving === 'saving'}>
              {saving === 'saving' && <LoaderCircle className="spin" aria-hidden="true" />}
              {saving === 'saving' ? 'Saving…' : <>Save <Sparkles aria-hidden="true" /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
