import { useEffect } from 'react'

// Every dialog/sheet in the app is `position: fixed`, so it already covers the viewport
// regardless of body scroll — but without this, the page behind it can still scroll (iOS
// rubber-banding, and the page landing somewhere new once the dialog closes). Locking body
// scroll while a dialog is mounted avoids both. Captures the current value rather than a
// hardcoded '' so stacked dialogs (e.g. Boost opened on top of RalliDetail) unwind correctly.
export function useBodyScrollLock(enabled = true) {
  useEffect(() => {
    if (!enabled) return
    // The scrolling box is whichever of <html>/<body> doesn't have an explicit height in
    // this app's CSS — locking only one leaves the other free to scroll, so both get it.
    const html = document.documentElement.style
    const body = document.body.style
    const previous = { html: html.overflow, body: body.overflow }
    html.overflow = 'hidden'
    body.overflow = 'hidden'
    return () => { html.overflow = previous.html; body.overflow = previous.body }
  }, [enabled])
}
