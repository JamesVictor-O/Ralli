import { useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bell, ChevronRight, Flame, HandCoins, Heart, Home, Plus, Search,
  Sparkles, Trophy, UserRound, UsersRound, WalletCards, Zap,
} from 'lucide-react'
import { DareFeed } from '../features/discover/DareFeed.tsx'
import type { Dare } from '../features/discover/DareCard.tsx'
import { RalliDetail } from '../features/rallis/RalliDetail.tsx'
import { CreateRalli } from '../features/rallis/CreateRalli.tsx'
import { JoinRalli } from '../features/rallis/JoinRalli.tsx'
import { Activity } from '../features/activity/Activity.tsx'
import { RalliChain } from '../features/chains/RalliChain.tsx'
import { Profile } from '../features/profile/Profile.tsx'
import { CommunityRalli } from '../features/rallis/CommunityRalli.tsx'
import { WalletPanel } from '../components/navigation/WalletPanel.tsx'
import { useWallet } from '../store/wallet.ts'
import { SearchPanel, type SearchResultId } from '../features/discover/SearchPanel.tsx'
import { SplashScreen } from '../components/ui/SplashScreen.tsx'
import { Boost } from '../features/rewards/Boost.tsx'
import '../styles/index.css'

const navItems = [
  { label: 'Discover', icon: Home },
  { label: 'Activity', icon: Bell },
  { label: 'Create', icon: Plus, primary: true },
  { label: 'Chains', icon: Zap },
  { label: 'Me', icon: UserRound },
]

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const reduceMotion = useReducedMotion()
  const [activeNav, setActiveNav] = useState('Discover')
  const [activeFlow, setActiveFlow] = useState<'detail' | 'join' | 'create' | 'community' | null>(() =>
    new URLSearchParams(window.location.search).get('ralli') === 'weirdest-desk-item' ? 'detail' : null,
  )
  const [walletOpen, setWalletOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [boostTarget, setBoostTarget] = useState<Dare | null>(null)
  const { status: walletStatus, account } = useWallet()
  const finishSplash = useCallback(() => setShowSplash(false), [])

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', openSearch)
    return () => window.removeEventListener('keydown', openSearch)
  }, [])

  function selectSearchResult(id: SearchResultId) {
    setSearchOpen(false)
    if (id === 'cities') {
      setActiveFlow('community')
      return
    }
    if (id === 'chains') {
      setActiveFlow(null)
      setActiveNav('Chains')
      return
    }
    setActiveFlow('detail')
  }

  return (
    <>
    <AnimatePresence mode="wait">
      {showSplash ? (
        <SplashScreen key="splash" onComplete={finishSplash} />
      ) : (
        <motion.div
          key="app"
          initial={reduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0, 0, 0.2, 1] }}
        >
    <div className={`app-shell ${activeNav !== 'Discover' ? 'app-shell--focus' : ''}`}>
      <aside className="side-nav" aria-label="Primary navigation">
        <a className="brand" href="/" aria-label="Ralli home">
          <img className="brand-mark" src="/railIcon.png" width="1254" height="1254" alt="" /><span>ralli</span>
        </a>
        <nav className="side-nav__links">
          {navItems.filter((item) => !item.primary).map((item) => {
            const Icon = item.icon
            const isActive = activeNav === item.label
            return (
              <button className={`nav-button ${isActive ? 'is-active' : ''}`} key={item.label}
                type="button" aria-current={isActive ? 'page' : undefined}
                onClick={() => {
                  setActiveFlow(null)
                  setActiveNav(item.label)
                }}>
                <Icon aria-hidden="true" /><span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <button className="create-button" type="button" onClick={() => setActiveFlow('create')}><Plus aria-hidden="true" /><span>Start a Ralli</span></button>
        <button className="profile-chip" type="button" onClick={() => setWalletOpen(true)}>
          <span className="avatar avatar--me" aria-hidden="true">AO</span>
          <span><strong>{account ? 'Nimiq connected' : 'Alex O.'}</strong><small>{account ? `${account.slice(0, 7)}…${account.slice(-4)}` : 'Connect Nimiq wallet'}</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </aside>

      <main className="main-column">
        <header className="mobile-header">
          <a className="brand" href="/" aria-label="Ralli home">
            <img className="brand-mark" src="/railIcon.png" width="1254" height="1254" alt="" /><span>ralli</span>
          </a>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /></button>
            <button className="icon-button has-notification" type="button" aria-label="Notifications"><Bell aria-hidden="true" /></button>
            <button className={`icon-button wallet-trigger ${walletStatus === 'connected' ? 'is-connected' : ''}`} type="button" aria-label="Open Nimiq wallet" onClick={() => setWalletOpen(true)}><WalletCards aria-hidden="true" /></button>
          </div>
        </header>

        {activeNav === 'Discover' && (<>
        <section className="welcome-row" aria-labelledby="discover-heading">
          <div><p className="eyebrow">Monday, August 31</p><h1 id="discover-heading">What will you do today?</h1></div>
          <button className="desktop-search" type="button" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search Rallis</span><kbd>⌘ K</kbd></button>
        </section>

        <section className="daily-ralli" aria-labelledby="daily-heading">
          <div className="daily-ralli__glow" aria-hidden="true" />
          <div className="daily-ralli__content">
            <div className="daily-ralli__pills">
              <span className="pill pill--dark"><Sparkles aria-hidden="true" />Daily Ralli</span>
              <span className="pill pill--funded"><Zap aria-hidden="true" />50 NIM pool</span>
            </div>
            <div>
              <p className="daily-ralli__kicker">Everyone gets the same prompt</p>
              <h2 id="daily-heading">Make something ordinary look dramatic.</h2>
            </div>
            <div className="daily-ralli__footer">
              <div className="participant-stack" aria-label="1,284 people joined">
                <span className="avatar avatar--one">VK</span><span className="avatar avatar--two">SA</span>
                <span className="avatar avatar--three">JM</span><strong>+1.2k joined</strong>
              </div>
              <button className="button button--ink" type="button" onClick={() => setActiveFlow('join')}>Join today’s Ralli<ChevronRight aria-hidden="true" /></button>
            </div>
          </div>
          <div className="daily-ralli__art" aria-hidden="true">
            <span className="shape shape--sun" /><span className="shape shape--arch" /><span className="shape shape--spark">✦</span>
          </div>
        </section>

        <section className="economy-loop" aria-labelledby="economy-heading">
          <header><div><p className="eyebrow">Powered by Nimiq</p><h2 id="economy-heading">Participation has real momentum.</h2></div><span className="nim-mark">NIM</span></header>
          <div className="economy-loop__steps">
            <div><span><Sparkles aria-hidden="true" /></span><p><strong>Reward</strong><small>A creator starts the pool.</small></p></div>
            <i aria-hidden="true">→</i>
            <div><span><Zap aria-hidden="true" /></span><p><strong>Boost</strong><small>The crowd grows it.</small></p></div>
            <i aria-hidden="true">→</i>
            <div><span><HandCoins aria-hidden="true" /></span><p><strong>Tip</strong><small>Great responses earn directly.</small></p></div>
          </div>
        </section>

        <div className="feed-heading">
          <div><p className="eyebrow">Happening now</p><h2>Made for joining</h2></div>
          <div className="feed-tabs" role="tablist" aria-label="Discover feed">
            <button className="is-active" type="button" role="tab" aria-selected="true">For you</button>
            <button type="button" role="tab" aria-selected="false">Trending</button>
            <button type="button" role="tab" aria-selected="false">New</button>
          </div>
        </div>
        <DareFeed onOpen={() => setActiveFlow('detail')} onJoin={() => setActiveFlow('join')} onBoost={setBoostTarget} />
        </>)}
        {activeNav === 'Activity' && <Activity />}
        {activeNav === 'Chains' && <RalliChain />}
        {activeNav === 'Me' && <Profile />}
      </main>

      {activeNav === 'Discover' && (
      <aside className="right-rail" aria-label="Community highlights">
        <div className="rail-card streak-card">
          <span className="rail-icon rail-icon--lime"><Flame aria-hidden="true" /></span>
          <div><strong>12 day streak</strong><p>You’re on fire. Join one today to keep it going.</p></div>
          <div className="week-row" aria-label="Participation this week">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
              <span className={index < 5 ? 'is-done' : ''} key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
        </div>
        <div className="rail-card">
          <div className="rail-card__heading">
            <div><p className="eyebrow">Community goal</p><h3>100 cities in 24 hours</h3></div>
            <span className="rail-icon rail-icon--violet"><UsersRound aria-hidden="true" /></span>
          </div>
          <p>Show us one thing that makes your city yours.</p>
          <div className="progress-label"><span>73 cities reached</span><strong>73%</strong></div>
          <div className="progress-track"><span /></div>
          <button className="text-button" type="button" onClick={() => setActiveFlow('community')}>View community Ralli <ChevronRight aria-hidden="true" /></button>
        </div>
        <div className="rail-card mini-leaderboard">
          <div className="rail-card__heading">
            <div><p className="eyebrow">This week</p><h3>Crowd favourites</h3></div>
            <span className="rail-icon"><Trophy aria-hidden="true" /></span>
          </div>
          {[
            ['1', 'Maya K.', '2.4k reactions'], ['2', 'Jo N.', '1.8k reactions'], ['3', 'Kofi A.', '1.3k reactions'],
          ].map(([rank, name, reactions]) => (
            <div className="leader-row" key={rank}>
              <span className="rank">{rank}</span><span className={`avatar avatar--leader avatar--leader-${rank}`}>{name.slice(0, 1)}</span>
              <span><strong>{name}</strong><small>{reactions}</small></span><Heart aria-hidden="true" />
            </div>
          ))}
        </div>
      </aside>
      )}

      {activeFlow === 'detail' && (
        <RalliDetail onClose={() => setActiveFlow(null)} onJoin={() => setActiveFlow('join')} />
      )}
      {activeFlow === 'join' && (
        <JoinRalli onBack={() => setActiveFlow('detail')} onClose={() => setActiveFlow(null)} />
      )}
      {activeFlow === 'create' && (
        <CreateRalli onClose={() => setActiveFlow(null)} />
      )}
      {activeFlow === 'community' && (
        <CommunityRalli onClose={() => setActiveFlow(null)} />
      )}
      {walletOpen && <WalletPanel onClose={() => setWalletOpen(false)} />}
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} onSelect={selectSearchResult} />}
      {boostTarget && <Boost creator={boostTarget.author} ralli={boostTarget.prompt} pool={boostTarget.reward} onClose={() => setBoostTarget(null)} />}

      <nav className="bottom-nav" aria-label="Primary navigation">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = activeNav === item.label
          return (
            <button className={`bottom-nav__item ${item.primary ? 'bottom-nav__item--primary' : ''} ${isActive ? 'is-active' : ''}`}
              key={item.label} type="button" aria-label={item.primary ? 'Start a Ralli' : item.label}
              aria-current={isActive ? 'page' : undefined} onClick={() => {
                if (item.primary) {
                  setActiveFlow('create')
                } else {
                  setActiveFlow(null)
                  setActiveNav(item.label)
                }
              }}>
              <Icon aria-hidden="true" /><span>{item.label}</span>
            </button>
          )
        })}
      </nav>
    </div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  )
}
