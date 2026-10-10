import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { injectDesignTokens } from './lib/design-tokens'
import { getTheme, THEMES } from './lib/theme'
import './index.css'

injectDesignTokens(THEMES[getTheme()].colors)

// Service worker minimal supaya aplikasi bisa dipasang (antrean #135). Hanya
// di build produksi: di dev ia mengganggu pemuatan ulang modul Vite.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((e) => console.warn('[sw] gagal didaftarkan:', e))
  })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
