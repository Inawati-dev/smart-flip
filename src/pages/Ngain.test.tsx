// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router'
import Ngain from './Ngain'

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: null } }),
      signOut: async () => ({ error: null }),
    },
    from: () => ({ select: () => ({ eq: () => ({ single: async () => ({ data: null, error: null }) }) }) }),
  },
  isSupabaseConfigured: false,
}))

function renderNgain() {
  return renderToStaticMarkup(
    <MemoryRouter>
      <Ngain />
    </MemoryRouter>,
  )
}

describe('Ngain', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders without throwing', () => {
    const html = renderNgain()
    expect(html).toBeTruthy()
  })

  it('renders the page heading and formula/threshold explanation', () => {
    const html = renderNgain()
    expect(html).toContain('N-Gain Calculator SDL')
    expect(html).toContain('g = (Post')
    expect(html).toContain('Tinggi (g')
    expect(html).toContain('Sedang (0.3')
    expect(html).toContain('Rendah (g')
  })

  it('seeds the table with the 5 legacy dummy students', () => {
    const html = renderNgain()
    expect(html).toContain('Ahmad Rizki')
    expect(html).toContain('Budi Santoso')
    expect(html).toContain('Citra Dewi')
    expect(html).toContain('Diana Putri')
    expect(html).toContain('Eko Prasetyo')
    expect(html).toContain('5 mahasiswa')
  })

  it('does not show the results panel before "Hitung N-Gain" is clicked (SSR/initial render)', () => {
    const html = renderNgain()
    expect(html).not.toContain('Hasil Analisis N-Gain')
  })

  it('defaults Skor Maksimum to 100 and Jumlah Mahasiswa to 30', () => {
    const html = renderNgain()
    expect(html).toContain('value="100"')
    expect(html).toContain('value="30"')
  })
})
