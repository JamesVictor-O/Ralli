import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

/* ─────────────────────────────────────────────────────────
 * SPLASH STORYBOARD
 *
 *    0ms   icon settles into view
 *  220ms   wordmark and promise appear
 *  420ms   three-beat loader starts moving
 * 1980ms   splash hands off to the app
 * ───────────────────────────────────────────────────────── */

const TIMING = {
  identity: 220,
  loader: 420,
  complete: 1980,
  reducedComplete: 800,
}

const ICON_SPRING = { type: 'spring' as const, stiffness: 330, damping: 25 }
const COPY_SPRING = { type: 'spring' as const, stiffness: 360, damping: 30 }

interface SplashScreenProps {
  onComplete: () => void
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const reduceMotion = useReducedMotion()
  const [stage, setStage] = useState(reduceMotion ? 2 : 0)

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = []

    if (!reduceMotion) {
      timers.push(setTimeout(() => setStage(1), TIMING.identity))
      timers.push(setTimeout(() => setStage(2), TIMING.loader))
    }
    timers.push(setTimeout(onComplete, reduceMotion ? TIMING.reducedComplete : TIMING.complete))

    return () => timers.forEach(clearTimeout)
  }, [onComplete, reduceMotion])

  return (
    <motion.div
      className="splash-screen"
      initial={reduceMotion ? false : { opacity: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
      transition={{ duration: reduceMotion ? 0 : 0.25, ease: [0.4, 0, 1, 1] }}
      role="status"
      aria-live="polite"
      aria-label="Ralli is loading"
    >
      <div className="splash-screen__glow" aria-hidden="true" />
      <div className="splash-screen__content">
        <motion.div
          className="splash-screen__icon-wrap"
          initial={reduceMotion ? false : { opacity: 0, scale: 0.78, rotate: -7 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={reduceMotion ? { duration: 0 } : ICON_SPRING}
        >
          <img src="/railIcon.png" width="1254" height="1254" alt="" />
        </motion.div>

        <motion.div
          className="splash-screen__identity"
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: stage >= 1 ? 1 : 0, y: stage >= 1 ? 0 : 10 }}
          transition={reduceMotion ? { duration: 0 } : COPY_SPRING}
        >
          <strong>ralli</strong>
          <p>Start it. Join it. Pass it on.</p>
        </motion.div>

        <div className={`splash-loader ${stage >= 2 ? 'is-active' : ''}`} aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
    </motion.div>
  )
}
