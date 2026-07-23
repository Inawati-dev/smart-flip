import { describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import { Register } from './Register'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: async () => ({ data: { user: null }, error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

describe('Register', () => {
  it('renders the registration form fields', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    expect(html).toContain('type="text"')
    expect(html).toContain('type="email"')
    expect(html).toContain('type="password"')
    expect(html).toContain('Buat Akun Baru')
  })
})
