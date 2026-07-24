// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Register, isDosenInviteCodeValid } from './Register'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: async () => ({ data: { user: null }, error: null }),
    },
  },
  isSupabaseConfigured: false,
}))

afterEach(() => {
  cleanup()
})

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

  it('does not render the Dosen invite code field for the default "mahasiswa" role', () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    expect(html).not.toContain('Kode Undangan Dosen')
  })
})

// isDosenInviteCodeValid is a UX-deterrent-only check (see comment above its
// definition in Register.tsx) — it is not a security boundary, but it should
// still behave correctly for the cases the UI relies on.
describe('isDosenInviteCodeValid', () => {
  it('rejects when no invite code is configured (VITE_DOSEN_INVITE_CODE unset)', () => {
    expect(isDosenInviteCodeValid('anything', undefined)).toBe(false)
    expect(isDosenInviteCodeValid('anything', '')).toBe(false)
  })

  it('rejects empty or mismatched input', () => {
    expect(isDosenInviteCodeValid('', 'SECRET-123')).toBe(false)
    expect(isDosenInviteCodeValid('wrong-code', 'SECRET-123')).toBe(false)
  })

  it('accepts an exact match, trimming surrounding whitespace', () => {
    expect(isDosenInviteCodeValid('SECRET-123', 'SECRET-123')).toBe(true)
    expect(isDosenInviteCodeValid('  SECRET-123  ', 'SECRET-123')).toBe(true)
  })
})

describe('Register — Dosen invite code field (interactive)', () => {
  it('appears once "Dosen" is selected, and disappears again when switching back', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.queryByLabelText('Kode Undangan Dosen')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Dosen' }))
    expect(screen.getByLabelText('Kode Undangan Dosen')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Mahasiswa' }))
    expect(screen.queryByLabelText('Kode Undangan Dosen')).toBeNull()
  })
})

// Kode Kelas is the mahasiswa-side counterpart of the Dosen invite code
// field above, but OPTIONAL (see migration_v7_kelas.sql) — it should show
// for the default "mahasiswa" role and disappear for "dosen", the exact
// opposite visibility of the invite code field.
describe('Register — Kode Kelas field (interactive)', () => {
  it('is visible by default (role starts as "mahasiswa") and disappears for "Dosen"', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/Kode Kelas/)).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Dosen' }))
    expect(screen.queryByLabelText(/Kode Kelas/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mahasiswa' }))
    expect(screen.getByLabelText(/Kode Kelas/)).toBeTruthy()
  })

  it('is not marked required, unlike the Dosen invite code field', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    const input = screen.getByLabelText(/Kode Kelas/) as HTMLInputElement
    expect(input.required).toBe(false)
  })
})
