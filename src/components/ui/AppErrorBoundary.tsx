import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { failed: boolean; message: string }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false, message: '' }
  private recoveryTimer: number | null = null

  componentDidMount() {
    this.recoveryTimer = window.setTimeout(() => {
      try {
        window.sessionStorage.removeItem('ralli-chunk-recovery')
        const url = new URL(window.location.href)
        if (url.searchParams.has('_refresh')) {
          url.searchParams.delete('_refresh')
          window.history.replaceState({}, '', url)
        }
      } catch { /* Storage may be unavailable in an embedded WebView. */ }
    }, 15_000)
  }

  componentWillUnmount() {
    if (this.recoveryTimer !== null) window.clearTimeout(this.recoveryTimer)
  }

  static getDerivedStateFromError(): State {
    return { failed: true, message: '' }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ralli encountered an unexpected interface error', error, info)
    this.setState({ message: error.message })
    if (/dynamically imported module|loading chunk|failed to fetch.*module/i.test(error.message)) {
      try {
        const retryKey = 'ralli-chunk-recovery'
        if (window.sessionStorage.getItem(retryKey) !== 'attempted') {
          window.sessionStorage.setItem(retryKey, 'attempted')
          const url = new URL(window.location.href)
          url.searchParams.set('_refresh', Date.now().toString())
          window.location.replace(url)
        }
      } catch { /* The recovery controls remain available below. */ }
    }
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-state" role="alert" aria-labelledby="fatal-state-title">
        <img src="/railIcon.png" width="72" height="72" alt="" />
        <span className="fatal-state__icon"><AlertTriangle aria-hidden="true" /></span>
        <h1 id="fatal-state-title">Ralli hit a snag</h1>
        <p>Your account and payments are safe. Try reopening the interface; reload only if the problem continues.</p>
        <button className="button button--ink" type="button" onClick={() => this.setState({ failed: false, message: '' })}>
          <RefreshCw aria-hidden="true" /> Try Ralli again
        </button>
        <button className="text-button fatal-state__reload" type="button" onClick={() => window.location.reload()}>Reload the app</button>
        {this.state.message && <details><summary>Technical details</summary><code>{this.state.message}</code></details>}
      </main>
    )
  }
}
