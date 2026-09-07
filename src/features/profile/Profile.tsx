import { type ChangeEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Award, Check, Flame, Heart, Image, LoaderCircle, Settings, Sparkles, Trophy, UsersRound, X, Zap } from 'lucide-react'
import { fetchMyProfile, updateMyProfile } from '../../lib/profile.ts'
import { optimizeAvatarImage, publicAvatarUrl, uploadAvatar } from '../../lib/media.ts'
import { Avatar } from '../../components/ui/Avatar.tsx'
import { useBackend } from '../../store/backend.ts'

type ProfileTab = 'Responses' | 'Rallis' | 'Trophies'
type ProfileData = Awaited<ReturnType<typeof fetchMyProfile>>

export function Profile() {
  const [tab, setTab] = useState<ProfileTab>('Responses')
  const [data, setData] = useState<ProfileData | null>(null)
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [handle, setHandle] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { user } = useBackend()

  const load = useCallback(async () => {
    if (!user) return
    setStatus('loading')
    try {
      const next = await fetchMyProfile(user.id)
      setData(next)
      setDisplayName(next.profile.display_name)
      setBio(next.profile.bio)
      setHandle(next.profile.handle ?? '')
      setStatus('success')
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : 'Your profile could not be loaded.')
      setStatus('error')
    }
  }, [user])
  useEffect(() => { void Promise.resolve().then(load) }, [load])
  useEffect(() => () => { if (avatarPreview) URL.revokeObjectURL(avatarPreview) }, [avatarPreview])

  function chooseAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    if (avatarPreview) URL.revokeObjectURL(avatarPreview)
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!user || !displayName.trim()) return setError('Add a display name.')
    if (handle && !/^[a-z0-9_]{3,24}$/.test(handle)) return setError('Usernames use lowercase letters, numbers, and _ (3-24 characters).')
    setSaving(true)
    setError('')
    try {
      const avatarPath = avatarFile ? await uploadAvatar(user.id, await optimizeAvatarImage(avatarFile)) : undefined
      await updateMyProfile(user.id, { displayName, bio, handle: handle || null, markOnboarded: true, ...(avatarPath ? { avatarPath } : {}) })
      await load()
      setEditing(false)
      setAvatarFile(null)
      if (avatarPreview) URL.revokeObjectURL(avatarPreview)
      setAvatarPreview(null)
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Profile changes could not be saved.') }
    finally { setSaving(false) }
  }

  if (status === 'loading') return <section className="page-view empty-state" aria-busy="true"><span className="empty-state__icon"><LoaderCircle className="spin" aria-hidden="true" /></span><h1>Loading your Ralli identity…</h1></section>
  if (status === 'error' || !data) return <section className="page-view empty-state" role="alert"><span className="empty-state__icon"><AlertCircle aria-hidden="true" /></span><h1>Profile didn’t load</h1><p>{error}</p><button className="button button--ink" type="button" onClick={() => void load()}>Try again</button></section>

  const name = data.profile.display_name
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
  return <section className="page-view profile-page" aria-labelledby="profile-title">
    <header className="page-heading profile-heading"><div><p className="eyebrow">Your Ralli identity</p><h1 id="profile-title">Me</h1></div><button className="icon-button page-icon-button" type="button" aria-label="Edit profile" onClick={() => setEditing(true)}><Settings aria-hidden="true" /></button></header>
    <article className="profile-hero"><div className="profile-avatar" aria-hidden="true">{data.profile.avatar_path ? <img className="profile-avatar__image" src={publicAvatarUrl(data.profile.avatar_path) ?? undefined} alt="" /> : initials}<span><Sparkles /></span></div><div className="profile-identity"><h2>{name}</h2><p>{data.profile.nimiq_address_verified_at ? <><Check aria-hidden="true" /> Verified Nimiq identity</> : 'Wallet not verified'}</p><span>{data.profile.bio || 'Start a Ralli and make this profile yours.'}</span></div><button className="edit-profile" type="button" onClick={() => setEditing(true)}>Edit profile</button><div className="profile-stats"><span><strong>{data.responses.length}</strong><small>Joined</small></span><span><strong>{data.rallis.length}</strong><small>Started</small></span><span><strong>{data.reactionCount}</strong><small>Reactions</small></span><span><strong>{data.passCount}</strong><small>Passes</small></span></div></article>
    <div className="profile-highlights"><article className="highlight-card highlight-card--lime"><span><Flame aria-hidden="true" /></span><div><strong>{data.responses.length} joins</strong><small>Participation</small></div></article><article className="highlight-card highlight-card--violet"><span><Zap aria-hidden="true" /></span><div><strong>{data.nimEarned} NIM</strong><small>Confirmed tips</small></div></article><article className="highlight-card highlight-card--coral"><span><Trophy aria-hidden="true" /></span><div><strong>{data.reactionCount}</strong><small>Community reactions</small></div></article></div>
    <div className="profile-tabs" role="tablist" aria-label="Profile content">{(['Responses', 'Rallis', 'Trophies'] as ProfileTab[]).map((item) => <button className={tab === item ? 'is-active' : ''} type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>)}</div>
    {tab === 'Responses' && (data.responses.length ? <div className="response-gallery">{data.responses.map((response) => <article className="gallery-item" key={response.id}>{response.mediaUrl ? response.format === 'video' ? <video src={response.mediaUrl} controls preload="metadata" /> : <img src={response.mediaUrl} alt={response.text_content || 'Your Ralli response'} width="400" height="400" /> : <span className="profile-text-response">{response.text_content}</span>}</article>)}</div> : <div className="empty-state"><Heart aria-hidden="true" /><h2>No responses yet</h2><p>Join a Ralli and your response will appear here.</p></div>)}
    {tab === 'Rallis' && (data.rallis.length ? <div className="profile-list">{data.rallis.map((ralli) => <article key={ralli.id}><span className="rail-icon rail-icon--lime"><UsersRound aria-hidden="true" /></span><span><strong>{ralli.prompt}</strong><small>Ends {new Date(ralli.ends_at).toLocaleDateString()}</small></span></article>)}</div> : <div className="empty-state"><Sparkles aria-hidden="true" /><h2>You haven’t started one yet</h2><p>Your Rallis will appear here after publishing.</p></div>)}
    {tab === 'Trophies' && <div className="trophy-grid"><article><span><Award aria-hidden="true" /></span><strong>First Move</strong><p>{data.responses.length ? 'Unlocked with your first response.' : 'Join your first Ralli to unlock.'}</p></article><article><span><Trophy aria-hidden="true" /></span><strong>Chain Starter</strong><p>{data.passCount ? `You passed ${data.passCount} Ralli${data.passCount === 1 ? '' : 's'} on.` : 'Pass a Ralli on to unlock.'}</p></article></div>}
    {editing && <div className="wallet-backdrop wallet-backdrop--nested" role="dialog" aria-modal="true" aria-labelledby="edit-profile-title"><section className="payment-panel"><header className="wallet-panel__header"><h2 id="edit-profile-title">Edit profile</h2><button className="icon-button" type="button" aria-label="Close profile editor" onClick={() => setEditing(false)}><X aria-hidden="true" /></button></header><form className="payment-form" onSubmit={save}>
      <input className="sr-only" ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={chooseAvatar} />
      <button className="avatar-picker" type="button" onClick={() => avatarInputRef.current?.click()}>
        <Avatar initials={initials} avatarUrl={avatarPreview || publicAvatarUrl(data.profile.avatar_path)} className="avatar-picker__preview" />
        <span><Image aria-hidden="true" />{data.profile.avatar_path || avatarFile ? 'Change photo' : 'Add photo'}</span>
      </button>
      <div className="field"><label htmlFor="display-name">Display name</label><input id="display-name" type="text" autoComplete="name" maxLength={60} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></div>
      <div className="field"><label htmlFor="profile-handle">Username <span>Optional</span></label><div className="input-with-icon"><strong>@</strong><input id="profile-handle" type="text" autoComplete="off" maxLength={24} placeholder="yourname" value={handle} onChange={(event) => setHandle(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))} /></div></div>
      <div className="field"><label htmlFor="profile-bio">Bio</label><textarea id="profile-bio" rows={4} maxLength={240} value={bio} onChange={(event) => setBio(event.target.value)} /></div>
      {error && <p className="payment-error" role="alert">{error}</p>}
      <button className="button button--ink button--wide" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
    </form></section></div>}
  </section>
}
