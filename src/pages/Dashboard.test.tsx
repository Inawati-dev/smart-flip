import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { AuthProvider } from '../contexts/AuthContext'
import { Dashboard } from './Dashboard'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      getUser: async () => ({ data: { user: null } }),
    },
    from: () => ({
      select: () => ({ order: async () => ({ data: [], error: null }) }),
    }),
  },
  isSupabaseConfigured: false,
}))

describe('Dashboard', () => {
  it('renders without throwing when there are no modules yet', () => {
    const queryClient = new QueryClient()
    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AuthProvider>
            <Dashboard />
          </AuthProvider>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    expect(html).toBeTruthy()
  })
})
