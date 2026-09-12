import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function ConnectionNotice() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    const connected = () => setOnline(true)
    const disconnected = () => setOnline(false)
    window.addEventListener('online', connected)
    window.addEventListener('offline', disconnected)
    return () => {
      window.removeEventListener('online', connected)
      window.removeEventListener('offline', disconnected)
    }
  }, [])

  if (online) return null
  return <div className="connection-notice" role="status"><WifiOff aria-hidden="true" /><span><strong>You’re offline.</strong> Your feed is still here; posting and NIM payments will resume when you reconnect.</span></div>
}
