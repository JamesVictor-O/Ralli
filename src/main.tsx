import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App.tsx'
import { AppProviders } from './app/providers.tsx'
import { BackendProvider } from './app/backend-provider.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BackendProvider>
      <AppProviders>
        <App />
      </AppProviders>
    </BackendProvider>
  </StrictMode>,
)
