import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { ResetPassword } from './ResetPassword'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      setSession: async () => ({ error: null }),
      updateUser: async () => ({ error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('ResetPassword', () => {
  it('renders the password fields in demo mode', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ResetPassword />
      </MemoryRouter>,
    )
    expect(html).toContain('type="password"')
    expect(html).toContain('Buat Password Baru')
    expect(html).toContain('Demo Mode')
  })
})
