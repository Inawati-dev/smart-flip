import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { injectDesignTokens } from './lib/design-tokens'
import './index.css'

injectDesignTokens()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
