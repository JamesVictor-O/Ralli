import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props { children: ReactNode }
interface State { failed: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { failed: false }

  static getDerivedStateFromError(): State {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Ralli encountered an unexpected interface error', error, info)
  }

  render() {
    if (!this.state.failed) return this.props.children

    return (
      <main className="fatal-state" role="alert" aria-labelledby="fatal-state-title">
        <img src="/railIcon.png" width="72" height="72" alt="" />
        <span className="fatal-state__icon"><AlertTriangle aria-hidden="true" /></span>
        <h1 id="fatal-state-title">Ralli hit a snag</h1>
        <p>Your account and payments are safe. Reload the app to continue where you left off.</p>
        <button className="button button--ink" type="button" onClick={() => window.location.reload()}>
          <RefreshCw aria-hidden="true" /> Reload Ralli
        </button>
      </main>
    )
  }
}
