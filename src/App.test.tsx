// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './App'

vi.mock('./lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('App', () => {
  it('renders the login route at / without throwing', () => {
    // App.tsx owns its own <BrowserRouter> internally, so it must not be
    // wrapped in another Router here (react-router forbids nested Routers).
    // jsdom's default location is '/', which matches the Login route.
    const html = renderToStaticMarkup(<App />)
    expect(html).toBeTruthy()
  })
})
