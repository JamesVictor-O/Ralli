import HubApi from '@nimiq/hub-api'

let hub: HubApi | undefined

export function isNimiqPayContext() {
  return typeof window !== 'undefined' && Boolean(window.nimiqPay || window.nimiq)
}

// Nimiq Hub's default popup flow silently breaks on many mobile browsers: window.open()
// often takes over the current tab instead of opening a real popup, severing the
// postMessage channel before the Hub page can receive the request — the user then sees
// a generic "Invalid request" error. Hub's own redirect flow (navigate away, then back
// with the result appended to the URL) is what it's designed to fall back to there.
export function isMobileHubClient() {
  if (typeof navigator === 'undefined') return false
  const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent) || isTouchMac
}

export function getNimiqHub() {
  const endpoint = (import.meta.env.VITE_NIMIQ_HUB_URL as string | undefined)?.trim() || 'https://hub.nimiq.com'
  hub ??= new HubApi(endpoint)
  return hub
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
