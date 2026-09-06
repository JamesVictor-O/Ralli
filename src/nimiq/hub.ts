import HubApi from '@nimiq/hub-api'

let hub: HubApi | undefined

export function isNimiqPayContext() {
  return typeof window !== 'undefined' && Boolean(window.nimiqPay || window.nimiq)
}

export function getNimiqHub() {
  const endpoint = (import.meta.env.VITE_NIMIQ_HUB_URL as string | undefined)?.trim() || 'https://hub.nimiq.com'
  hub ??= new HubApi(endpoint)
  return hub
}

export function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
