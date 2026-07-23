import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import Changelog from './Changelog'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

function renderChangelog() {
  const queryClient = new QueryClient()
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <Changelog />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Changelog', () => {
  it('renders without throwing', () => {
    const html = renderChangelog()
    expect(html).toBeTruthy()
  })

  it('renders the page heading', () => {
    const html = renderChangelog()
    expect(html).toContain('Changelog')
  })

  it('renders every version entry from the legacy changelog', () => {
    const html = renderChangelog()
    const versions = [
      'v0.9.6', 'v0.9.5', 'v0.9.4', 'v0.9.3', 'v0.9.2', 'v0.9.1', 'v0.9',
      'v0.8.1', 'v0.8', 'v0.7', 'v0.5.2', 'v0.5', 'v0.4', 'v0.3', 'v0.2', 'v0.1',
    ]
    for (const v of versions) {
      expect(html).toContain(v)
    }
  })

  it('renders the roadmap section with all planned versions', () => {
    const html = renderChangelog()
    expect(html).toContain('Rencana ke Depan')
    expect(html).toContain('v1.0')
  })

  it('renders the change-type legend', () => {
    const html = renderChangelog()
    expect(html).toContain('FEAT')
    expect(html).toContain('FIX')
    expect(html).toContain('IMP')
    expect(html).toContain('REFAC')
    expect(html).toContain('SEC')
    expect(html).toContain('DOC')
  })
})
