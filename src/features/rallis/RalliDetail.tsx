import { useEffect, useState } from 'react'
import { ArrowLeft, Clock3, Heart, Repeat2, Share2, UsersRound, X, Zap } from 'lucide-react'
import { Boost } from '../rewards/Boost.tsx'
import { ResponseViewer } from '../responses/ResponseViewer.tsx'

export function RalliDetail({ onClose, onJoin }: { onClose: () => void; onJoin: () => void }) {
  const [boostOpen, setBoostOpen] = useState(false)
  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [onClose])

  return (
    <div className="flow-backdrop" role="dialog" aria-modal="true" aria-labelledby="ralli-title">
      <section className="flow-sheet flow-sheet--detail">
        <header className="flow-header">
          <button className="flow-back" type="button" onClick={onClose}><ArrowLeft aria-hidden="true" /><span>Discover</span></button>
          <button className="icon-button" type="button" aria-label="Close Ralli" onClick={onClose}><X aria-hidden="true" /></button>
        </header>

        <div className="detail-hero">
          <img src="https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=1400&q=85"
            alt="A creative desk filled with stationery and small objects" width="900" height="650" />
          <span className="pill pill--dark">Just for fun</span>
        </div>

        <div className="detail-body">
          <div className="author detail-author">
            <span className="avatar avatar--author avatar--coral">NK</span>
            <span><strong>Nia started this Ralli</strong><small>8 minutes ago</small></span>
            <button className="icon-button" type="button" aria-label="Share Ralli"><Share2 aria-hidden="true" /></button>
          </div>
          <h1 id="ralli-title">Show us the weirdest thing on your desk.</h1>
          <p className="detail-copy">No tidying. No moving things around. Show us the wonderfully strange object sitting closest to your keyboard right now.</p>

          <div className="detail-stats">
            <span><UsersRound aria-hidden="true" /><strong>84</strong><small>responses</small></span>
            <span><Heart aria-hidden="true" /><strong>192</strong><small>reactions</small></span>
            <span><Repeat2 aria-hidden="true" /><strong>17</strong><small>passes</small></span>
            <span><Clock3 aria-hidden="true" /><strong>22h</strong><small>left</small></span>
          </div>

          <div className="reward-panel">
            <span className="rail-icon rail-icon--lime"><Zap aria-hidden="true" /></span>
            <div><p className="eyebrow">Reward pool</p><strong>12 NIM</strong><small>for the crowd favourite</small></div>
            <button className="boost-button" type="button" onClick={() => setBoostOpen(true)}>Boost</button>
          </div>

          <ResponseViewer />
        </div>

        <footer className="flow-actions">
          <button className="button button--ink button--wide" type="button" onClick={onJoin}>Join this Ralli <ArrowLeft className="arrow-forward" aria-hidden="true" /></button>
        </footer>
      </section>
      {boostOpen && <Boost onClose={() => setBoostOpen(false)} />}
    </div>
  )
}
