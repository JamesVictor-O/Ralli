import { useState } from 'react'
import { Award, ChevronRight, Flame, Heart, MapPin, Settings, Sparkles, Trophy, UsersRound, Zap } from 'lucide-react'

type ProfileTab = 'Responses' | 'Rallis' | 'Trophies'

export function Profile() {
  const [tab, setTab] = useState<ProfileTab>('Responses')

  return (
    <section className="page-view profile-page" aria-labelledby="profile-title">
      <header className="page-heading profile-heading">
        <div><p className="eyebrow">Your Ralli identity</p><h1 id="profile-title">Me</h1></div>
        <button className="icon-button page-icon-button" type="button" aria-label="Profile settings"><Settings aria-hidden="true" /></button>
      </header>

      <article className="profile-hero">
        <div className="profile-avatar" aria-hidden="true">AO<span><Sparkles /></span></div>
        <div className="profile-identity">
          <h2>Alex Okoro</h2>
          <p><MapPin aria-hidden="true" /> Lagos, Nigeria</p>
          <span>Making ordinary things worth looking at.</span>
        </div>
        <button className="edit-profile" type="button">Edit profile</button>
        <div className="profile-stats">
          <span><strong>38</strong><small>Joined</small></span>
          <span><strong>7</strong><small>Started</small></span>
          <span><strong>2.8k</strong><small>Reactions</small></span>
          <span><strong>84</strong><small>People reached</small></span>
        </div>
      </article>

      <div className="profile-highlights">
        <article className="highlight-card highlight-card--lime">
          <span><Flame aria-hidden="true" /></span><div><strong>12 days</strong><small>Current streak</small></div>
        </article>
        <article className="highlight-card highlight-card--violet">
          <span><Zap aria-hidden="true" /></span><div><strong>48 NIM</strong><small>Earned in Rallis</small></div>
        </article>
        <article className="highlight-card highlight-card--coral">
          <span><Trophy aria-hidden="true" /></span><div><strong>Top 8%</strong><small>This week</small></div>
        </article>
      </div>

      <div className="profile-tabs" role="tablist" aria-label="Profile content">
        {(['Responses', 'Rallis', 'Trophies'] as ProfileTab[]).map((item) => (
          <button className={tab === item ? 'is-active' : ''} type="button" role="tab" aria-selected={tab === item} key={item} onClick={() => setTab(item)}>{item}</button>
        ))}
      </div>

      {tab === 'Responses' && (
        <div className="response-gallery">
          {[
            ['https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=600&q=80', 'A bright home workspace', '684'],
            ['https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80', 'A pastel sky', '421'],
            ['https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=80', 'Breakfast shared across a table', '318'],
            ['https://images.unsplash.com/photo-1523726491678-bf852e717f6a?auto=format&fit=crop&w=600&q=80', 'Colourful objects on a desk', '192'],
          ].map(([src, alt, likes]) => (
            <button className="gallery-item" type="button" key={src}>
              <img src={src} alt={alt} width="400" height="400" />
              <span><Heart aria-hidden="true" />{likes}</span>
            </button>
          ))}
        </div>
      )}
      {tab === 'Rallis' && (
        <div className="profile-list">
          {['Show us your city at sunrise', 'Recreate your oldest photo', 'What is on your desk?'].map((title, index) => (
            <button type="button" key={title}><span className="rail-icon rail-icon--lime"><UsersRound aria-hidden="true" /></span><span><strong>{title}</strong><small>{[42, 18, 84][index]} people joined</small></span><ChevronRight aria-hidden="true" /></button>
          ))}
        </div>
      )}
      {tab === 'Trophies' && (
        <div className="trophy-grid">
          {[
            [Award, 'Chain Starter', 'A chain reached 10 people'], [Trophy, 'Crowd Favourite', '500 reactions on one response'],
            [Flame, 'On Fire', 'A 7 day participation streak'], [MapPin, 'Around the World', 'Joined across 10 countries'],
          ].map(([Icon, title, copy]) => (
            <article key={title as string}><span><Icon aria-hidden="true" /></span><strong>{title as string}</strong><p>{copy as string}</p></article>
          ))}
        </div>
      )}
    </section>
  )
}
