import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Bell, ChevronRight, HandCoins, Home, Plus, Search,
  Sparkles, UserRound, WalletCards, Zap,
} from 'lucide-react'
import { DareFeed } from '../features/discover/DareFeed.tsx'
import { TodaysRalli } from '../features/discover/TodaysRalli.tsx'
import type { Dare } from '../features/discover/DareCard.tsx'
import { Avatar } from '../components/ui/Avatar.tsx'
import { useWallet } from '../store/wallet.ts'
import { useBackend } from '../store/backend.ts'
import { useMyProfileSummary } from '../hooks/useMyProfileSummary.ts'
import { useUnreadActivityCount } from '../hooks/useUnreadActivityCount.ts'
import { SplashScreen } from '../components/ui/SplashScreen.tsx'
import { fetchRalliById } from '../lib/rallis.ts'
import '../styles/index.css'

const Activity = lazy(() => import('../features/activity/Activity.tsx').then((module) => ({ default: module.Activity })))
const RalliChain = lazy(() => import('../features/chains/RalliChain.tsx').then((module) => ({ default: module.RalliChain })))
const Profile = lazy(() => import('../features/profile/Profile.tsx').then((module) => ({ default: module.Profile })))
const RalliDetail = lazy(() => import('../features/rallis/RalliDetail.tsx').then((module) => ({ default: module.RalliDetail })))
const CreateRalli = lazy(() => import('../features/rallis/CreateRalli.tsx').then((module) => ({ default: module.CreateRalli })))
const JoinRalli = lazy(() => import('../features/rallis/JoinRalli.tsx').then((module) => ({ default: module.JoinRalli })))
const Onboarding = lazy(() => import('../features/onboarding/Onboarding.tsx').then((module) => ({ default: module.Onboarding })))
const WalletPanel = lazy(() => import('../components/navigation/WalletPanel.tsx').then((module) => ({ default: module.WalletPanel })))
const SearchPanel = lazy(() => import('../features/discover/SearchPanel.tsx').then((module) => ({ default: module.SearchPanel })))
const Boost = lazy(() => import('../features/rewards/Boost.tsx').then((module) => ({ default: module.Boost })))

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
  const [activeFlow, setActiveFlow] = useState<'detail' | 'join' | 'create' | null>(null)
  const [selectedRalli, setSelectedRalli] = useState<Dare | null>(null)
  const [feedRefreshKey, setFeedRefreshKey] = useState(0)
  const [todaysRalliId, setTodaysRalliId] = useState<string | null>(null)
  const [walletOpen, setWalletOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [boostTarget, setBoostTarget] = useState<Dare | null>(null)
  const { status: walletStatus, account } = useWallet()
  const { user } = useBackend()
  const { summary: myProfile, refresh: refreshMyProfile } = useMyProfileSummary(user)
  const { count: unreadActivity, refresh: refreshUnreadActivity } = useUnreadActivityCount(user)
  const showOnboarding = walletStatus === 'connected' && Boolean(myProfile) && !myProfile?.onboarded
  const finishSplash = useCallback(() => setShowSplash(false), [])
  const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

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

  useEffect(() => {
    const ralliId = new URLSearchParams(window.location.search).get('ralli')
    if (!ralliId) return
    void fetchRalliById(ralliId).then((ralli) => {
      setSelectedRalli(ralli)
      setActiveFlow('detail')
    }).catch(() => undefined)
  }, [])

  function openRalli(ralli: Dare, flow: 'detail' | 'join' = 'detail') {
    setSelectedRalli(ralli)
    setActiveFlow(flow)
    const url = new URL(window.location.href)
    url.searchParams.set('ralli', ralli.id)
    window.history.replaceState({}, '', url)
  }

  function closeRalliFlow() {
    setActiveFlow(null)
    const url = new URL(window.location.href)
    url.searchParams.delete('ralli')
    window.history.replaceState({}, '', url)
  }

  function selectSearchResult(ralli: Dare) {
    setSearchOpen(false)
    openRalli(ralli)
  }

  return (
    <>
    <a className="skip-link" href="#main-content">Skip to main content</a>
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
                <span className="icon-with-badge"><Icon aria-hidden="true" />{item.label === 'Activity' && unreadActivity > 0 && <span className="nav-badge" aria-hidden="true" />}</span><span>{item.label}</span>
              </button>
            )
          })}
        </nav>
        <button className="create-button" type="button" onClick={() => setActiveFlow('create')}><Plus aria-hidden="true" /><span>Start a Ralli</span></button>
        <button className="profile-chip" type="button" onClick={() => setWalletOpen(true)}>
          <Avatar initials={myProfile?.initials ?? 'RA'} avatarUrl={myProfile?.avatarUrl} className="avatar--me" />
          <span><strong>{myProfile?.displayName ?? (account ? 'Nimiq connected' : 'Your Ralli profile')}</strong><small>{account ? `${account.slice(0, 7)}…${account.slice(-4)}` : 'Connect Nimiq wallet'}</small></span>
          <ChevronRight aria-hidden="true" />
        </button>
      </aside>

      <main className="main-column" id="main-content" tabIndex={-1}>
        <header className="mobile-header">
          <a className="brand" href="/" aria-label="Ralli home">
            <img className="brand-mark" src="/railIcon.png" width="1254" height="1254" alt="" /><span>ralli</span>
          </a>
          <div className="header-actions">
            <button className="icon-button" type="button" aria-label="Search" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /></button>
            <button className="icon-button" type="button" aria-label="Open activity" onClick={() => setActiveNav('Activity')}>
              <span className="icon-with-badge"><Bell aria-hidden="true" />{unreadActivity > 0 && <span className="nav-badge" aria-hidden="true" />}</span>
            </button>
            <button className={`icon-button wallet-trigger ${walletStatus === 'connected' ? 'is-connected' : ''}`} type="button" aria-label="Open Nimiq wallet" onClick={() => setWalletOpen(true)}><WalletCards aria-hidden="true" /></button>
          </div>
        </header>

        {activeNav === 'Discover' && (<>
        <section className="welcome-row" aria-labelledby="discover-heading">
          <div><p className="eyebrow">{today}</p><h1 id="discover-heading">What will you do today?</h1></div>
          <button className="desktop-search" type="button" onClick={() => setSearchOpen(true)}><Search aria-hidden="true" /><span>Search Rallis</span><kbd>⌘ K</kbd></button>
        </section>

        <TodaysRalli onJoin={(ralli) => openRalli(ralli, 'join')} onOpen={(ralli) => openRalli(ralli)} refreshKey={feedRefreshKey} onLoaded={setTodaysRalliId} />

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
        </div>
        <DareFeed onOpen={(ralli) => openRalli(ralli)} onJoin={(ralli) => openRalli(ralli, 'join')} onBoost={setBoostTarget} onCreate={() => setActiveFlow('create')} refreshKey={feedRefreshKey} excludeId={todaysRalliId} />
        </>)}
        {activeNav === 'Activity' && <Activity onOpenRalli={(ralli) => openRalli(ralli)} onRead={() => void refreshUnreadActivity()} />}
        {activeNav === 'Chains' && <RalliChain onOpenRalli={(ralli) => openRalli(ralli)} />}
        {activeNav === 'Me' && <Profile />}
      </main>

      {activeNav === 'Discover' && (
      <aside className="right-rail" aria-label="Community highlights">
        <div className="rail-card">
          <div className="rail-card__heading">
            <div><p className="eyebrow">Start the next one</p><h3>Give people something worth doing.</h3></div>
            <span className="rail-icon rail-icon--violet"><Sparkles aria-hidden="true" /></span>
          </div>
          <p>Create a challenge, optionally fund it with NIM, then pass it into the community.</p>
          <button className="text-button" type="button" onClick={() => setActiveFlow('create')}>Start a Ralli <ChevronRight aria-hidden="true" /></button>
        </div>
        <div className="rail-card">
          <div className="rail-card__heading">
            <div><p className="eyebrow">Nimiq economy</p><h3>Reward participation.</h3></div>
            <span className="rail-icon rail-icon--lime"><HandCoins aria-hidden="true" /></span>
          </div>
          <p>Boost a Ralli you want to see happen, or tip a response that deserves it.</p>
        </div>
      </aside>
      )}

      <Suspense fallback={<div className="route-loader" role="status">Loading…</div>}>
      {activeFlow === 'detail' && selectedRalli && (
        <RalliDetail ralli={selectedRalli} onClose={closeRalliFlow} onJoin={() => setActiveFlow('join')} />
      )}
      {activeFlow === 'join' && selectedRalli && (
        <JoinRalli ralliId={selectedRalli.id} prompt={selectedRalli.prompt} onBack={() => setActiveFlow('detail')} onClose={closeRalliFlow} onPosted={() => setFeedRefreshKey((value) => value + 1)} />
      )}
      {activeFlow === 'create' && (
        <CreateRalli onClose={() => setActiveFlow(null)} onCreated={(id) => {
          setFeedRefreshKey((value) => value + 1)
          void fetchRalliById(id).then(setSelectedRalli)
        }} />
      )}
      {showOnboarding && user && <Onboarding userId={user.id} onDone={() => void refreshMyProfile()} />}
      {walletOpen && <WalletPanel onClose={() => setWalletOpen(false)} />}
      {searchOpen && <SearchPanel onClose={() => setSearchOpen(false)} onSelect={selectSearchResult} />}
      {boostTarget && <Boost ralliId={boostTarget.id} creator={boostTarget.author} ralli={boostTarget.prompt} pool={boostTarget.reward} onClose={() => setBoostTarget(null)} />}
      </Suspense>

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
              <span className="icon-with-badge"><Icon aria-hidden="true" />{item.label === 'Activity' && unreadActivity > 0 && <span className="nav-badge" aria-hidden="true" />}</span><span>{item.label}</span>
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
