import { useEffect, useRef, useState } from 'react'
import { LoaderCircle, Pause, Play, Volume2, VolumeX } from 'lucide-react'

export function FeedVideo({ src, poster, className = '', compact = false }: { src: string; poster?: string | null; className?: string; compact?: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const visibleRef = useRef(false)
  const [shouldLoad, setShouldLoad] = useState(false)
  const [ready, setReady] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [needsPlay, setNeedsPlay] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry) return
      if (entry.isIntersecting) setShouldLoad(true)
      visibleRef.current = entry.intersectionRatio >= 0.65
      if (visibleRef.current && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
        void video.play().then(() => setNeedsPlay(false)).catch(() => setNeedsPlay(true))
      } else if (!visibleRef.current) {
        video.pause()
      }
    }, { rootMargin: '700px 0px', threshold: [0, 0.65, 1] })
    observer.observe(video)
    const onVisibility = () => document.hidden ? video.pause() : visibleRef.current && void video.play().catch(() => setNeedsPlay(true))
    document.addEventListener('visibilitychange', onVisibility)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', onVisibility); video.pause() }
  }, [])

  function togglePlayback() {
    const video = videoRef.current
    if (!video) return
    if (video.paused) void video.play().then(() => setNeedsPlay(false)).catch(() => setNeedsPlay(true))
    else video.pause()
  }

  function toggleSound() {
    const video = videoRef.current
    if (!video) return
    video.muted = !muted
    setMuted(!muted)
    if (video.paused) void video.play().catch(() => setNeedsPlay(true))
  }

  return (
    <div className={`feed-video ${compact ? 'feed-video--compact' : ''} ${playing ? 'is-playing' : ''} ${className}`}>
      <video ref={videoRef} src={shouldLoad ? src : undefined} poster={poster ?? undefined} muted={muted} playsInline loop preload={shouldLoad ? 'metadata' : 'none'}
        onCanPlay={() => { setReady(true); if (visibleRef.current) void videoRef.current?.play().catch(() => setNeedsPlay(true)) }}
        onPlaying={() => { setPlaying(true); setNeedsPlay(false) }} onPause={() => setPlaying(false)} />
      {!ready && shouldLoad && <span className="feed-video__loading" role="status" aria-label="Loading video"><LoaderCircle className="spin" aria-hidden="true" /></span>}
      <button className={`feed-video__play ${needsPlay ? 'is-visible' : ''}`} type="button" aria-label={playing ? 'Pause video' : 'Play video'} onClick={togglePlayback}>
        {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
      </button>
      {!compact && <button className="feed-video__sound" type="button" aria-label={muted ? 'Turn video sound on' : 'Mute video'} onClick={toggleSound}>
        {muted ? <VolumeX aria-hidden="true" /> : <Volume2 aria-hidden="true" />}
      </button>}
    </div>
  )
}
