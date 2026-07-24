import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { injectDesignTokens } from './lib/design-tokens'
import { getTheme, THEMES } from './lib/theme'
import './index.css'

injectDesignTokens(THEMES[getTheme()].colors)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
