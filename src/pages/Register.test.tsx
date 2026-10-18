// @vitest-environment jsdom
import { afterEach, describe, it, expect, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { Register, isDosenInviteCodeValid } from './Register'

const mockSupabase = vi.hoisted(() => ({
  configured: false,
  signUp: vi.fn<(args: unknown) => Promise<{ data: { user: null }; error: Error | null }>>(async () => ({ data: { user: null }, error: null })),
  // Jawaban verify_course_code (antrean #228): true = kode mata kuliah dikenali.
  kodeMk: true as boolean,
  rpc: vi.fn<(nama: string, arg: unknown) => Promise<{ data: boolean; error: null }>>(async () => ({ data: true, error: null })),
}))

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: mockSupabase.signUp,
    },
    rpc: (nama: string, arg: unknown) => mockSupabase.rpc(nama, arg).then(() => ({ data: mockSupabase.kodeMk, error: null })),
  },
  get isSupabaseConfigured() {
    return mockSupabase.configured
  },
}))

afterEach(() => {
  cleanup()
  mockSupabase.configured = false
  mockSupabase.signUp.mockClear()
  mockSupabase.rpc.mockClear()
  mockSupabase.kodeMk = true
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

// Kode mata kuliah (antrean #228) menggantikan kode kelas: tampil untuk
// mahasiswa, hilang untuk dosen, wajib diisi.
describe('Register — Kode Mata Kuliah field (interactive)', () => {
  it('is visible by default (role starts as "mahasiswa") and disappears for "Dosen"', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )

    expect(screen.getByLabelText(/Kode Mata Kuliah/)).toBeTruthy()
    expect(screen.queryByLabelText(/Kode Kelas/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Dosen' }))
    expect(screen.queryByLabelText(/Kode Mata Kuliah/)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Mahasiswa' }))
    expect(screen.getByLabelText(/Kode Mata Kuliah/)).toBeTruthy()
  })

  it('is marked required for mahasiswa', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    const input = screen.getByLabelText(/Kode Mata Kuliah/) as HTMLInputElement
    expect(input.required).toBe(true)
  })
})

const ANGKATAN_UJI = String(new Date().getFullYear() - 1)

function pilihAngkatan(tahun: string) {
  fireEvent.click(screen.getByLabelText('Tahun Angkatan'))
  fireEvent.click(screen.getByRole('option', { name: tahun }))
}

function isiDanKirim(kode: string, angkatan: string = ANGKATAN_UJI) {
  mockSupabase.configured = true
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )
  fireEvent.change(screen.getByLabelText('Nama Lengkap'), { target: { value: 'Budi' } })
  fireEvent.change(screen.getByLabelText('NIM'), { target: { value: '123' } })
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'budi@example.com' } })
  fireEvent.change(screen.getByLabelText('Kata Sandi'), { target: { value: 'rahasia123' } })
  if (kode) fireEvent.change(screen.getByLabelText(/Kode Mata Kuliah/), { target: { value: kode } })
  if (angkatan) pilihAngkatan(angkatan)
  fireEvent.submit(screen.getByRole('button', { name: 'Daftar Sekarang' }).closest('form')!)
}

describe('Register — tautan konfirmasi email dan data pendaftaran', () => {
  it('memanggil signUp dengan emailRedirectTo ke akar aplikasi dan course_code kapital, tanpa class_code', async () => {
    isiDanKirim('mpp-2026')

    await waitFor(() => expect(mockSupabase.signUp).toHaveBeenCalledTimes(1))
    expect(mockSupabase.rpc).toHaveBeenCalledWith('verify_course_code', { submitted: 'MPP-2026' })
    const arg = mockSupabase.signUp.mock.calls[0][0] as { options: { emailRedirectTo: string; data: Record<string, unknown> } }
    expect(arg.options.emailRedirectTo.endsWith('/')).toBe(true)
    expect(arg.options.data.course_code).toBe('MPP-2026')
    expect(arg.options.data).not.toHaveProperty('class_code')
    expect(arg.options.data.angkatan).toBe(ANGKATAN_UJI)
  })
})

// Antrean #239: tahun angkatan wajib bagi mahasiswa; kelas otomatis dibentuk per angkatan.
describe('Register — tahun angkatan', () => {
  it('pilihan tahun: tahun ini sampai 10 tahun lalu, bawaan kosong; hilang untuk dosen', () => {
    render(
      <MemoryRouter>
        <Register />
      </MemoryRouter>,
    )
    const pemicu = screen.getByLabelText('Tahun Angkatan')
    expect(pemicu.textContent).toContain('Pilih tahun angkatan')
    fireEvent.click(pemicu)
    const tahun = screen.getAllByRole('option').map((o) => o.textContent)
    const ini = new Date().getFullYear()
    expect(tahun).toEqual(Array.from({ length: 11 }, (_, i) => String(ini - i)))
    fireEvent.click(screen.getByRole('button', { name: 'Dosen' }))
    expect(screen.queryByLabelText('Tahun Angkatan')).toBeNull()
  })

  it('kosong: ditolak tanpa memanggil server', async () => {
    isiDanKirim('MPP-2026', '')
    expect(await screen.findByText(/Tahun angkatan wajib dipilih/)).toBeTruthy()
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
    expect(mockSupabase.signUp).not.toHaveBeenCalled()
  })

  it('server menolak dengan teks pemicu angkatan: tampil pesan angkatan', async () => {
    mockSupabase.signUp.mockResolvedValueOnce({ data: { user: null }, error: new Error('Tahun angkatan tidak sah (SQLSTATE 22023)') })
    isiDanKirim('MPP-2026')
    expect(await screen.findByText(/Pilih tahun angkatan Anda dari daftar/)).toBeTruthy()
  })
})

// Antrean #228: tanpa kode mata kuliah yang dikenali, akun mahasiswa tidak dibuat.
describe('Register — kode mata kuliah wajib', () => {
  it('kode kosong: ditolak tanpa memanggil server', async () => {
    isiDanKirim('')
    expect(await screen.findByText(/Kode mata kuliah wajib diisi/)).toBeTruthy()
    expect(mockSupabase.rpc).not.toHaveBeenCalled()
    expect(mockSupabase.signUp).not.toHaveBeenCalled()
  })

  it('kode tidak dikenali: akun tidak dibuat', async () => {
    mockSupabase.kodeMk = false
    isiDanKirim('SALAH1')
    expect(await screen.findByText(/Kode mata kuliah tidak dikenali/)).toBeTruthy()
    expect(mockSupabase.signUp).not.toHaveBeenCalled()
  })

  it('server menolak dengan teks pemicu kode: tampil pesan kode salah', async () => {
    mockSupabase.signUp.mockResolvedValueOnce({ data: { user: null }, error: new Error('Kode mata kuliah tidak dikenali (SQLSTATE 22023)') })
    isiDanKirim('MPP-2026')
    expect(await screen.findByText(/Periksa lagi atau minta kodenya/)).toBeTruthy()
  })

  it('galat basis data lain: pesan umum, BUKAN pesan kode salah', async () => {
    mockSupabase.signUp.mockResolvedValueOnce({ data: { user: null }, error: new Error('Database error saving new user') })
    isiDanKirim('MPP-2026')
    expect(await screen.findByText(/Pendaftaran gagal di server/)).toBeTruthy()
    expect(screen.queryByText(/Kode mata kuliah tidak dikenali/)).toBeNull()
  })
})
