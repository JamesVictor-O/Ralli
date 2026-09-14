type StorageKind = 'local' | 'session'

function storage(kind: StorageKind) {
  try { return kind === 'local' ? window.localStorage : window.sessionStorage }
  catch { return null }
}

export function readBrowserStorage(kind: StorageKind, key: string) {
  try { return storage(kind)?.getItem(key) ?? null } catch { return null }
}

export function writeBrowserStorage(kind: StorageKind, key: string, value: string) {
  try { storage(kind)?.setItem(key, value) } catch { /* Embedded storage can be unavailable. */ }
}

export function removeBrowserStorage(kind: StorageKind, key: string) {
  try { storage(kind)?.removeItem(key) } catch { /* Nothing to remove. */ }
}
