// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { CapTes, teksCapTes } from './CapTes'
import { capAir } from '../lib/capAir'

const auth = { profile: { full_name: 'Siti Aminah', nim_nidn: '230101' } as { full_name: string; nim_nidn: string } | null, role: 'mahasiswa' as string | null }
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => auth }))

afterEach(cleanup)

describe('teksCapTes', () => {
  it('nama, NIM, tanggal, dan jam WIB (zona Jakarta, bukan zona peramban)', () => {
    // 8 Nov 2026 07.32 UTC = 14.32 WIB
    const teks = teksCapTes('Siti Aminah', '230101', new Date(Date.UTC(2026, 10, 8, 7, 32)))
    expect(teks).toBe('Siti Aminah · 230101 · 8 Nov 2026 14.32 WIB')
  })

  it('bagian kosong dibuang; tanpa identitas jatuh ke nama aplikasi', () => {
    const t = new Date(Date.UTC(2026, 10, 8, 7, 32))
    expect(teksCapTes('Siti', null, t)).toBe('Siti · 8 Nov 2026 14.32 WIB')
    expect(teksCapTes(null, undefined, t)).toBe('SMART-FLIP 5.0 · 8 Nov 2026 14.32 WIB')
  })
})

describe('CapTes', () => {
  it('menutupi seluruh layar lewat portal ke body, tidak menangkap klik, dan memuat nama dan NIM di polanya', () => {
    auth.role = 'mahasiswa'
    render(<CapTes />)
    const el = document.body.querySelector('[data-testid="cap-tes"]') as HTMLElement
    expect(el).toBeTruthy()
    expect(el.parentElement).toBe(document.body)
    expect(el.className).toContain('fixed')
    expect(el.className).toContain('inset-0')
    expect(el.className).toContain('pointer-events-none')
    const latar = decodeURIComponent(el.style.backgroundImage)
    expect(latar).toContain('Siti Aminah')
    expect(latar).toContain('230101')
    expect(latar).toContain('WIB')
  })

  it('tipis: abu-abu netral dengan opasitas rendah, bukan hitam 0,14 seperti watermark PDF', () => {
    auth.role = 'mahasiswa'
    render(<CapTes />)
    const latar = decodeURIComponent((document.body.querySelector('[data-testid="cap-tes"]') as HTMLElement).style.backgroundImage)
    expect(latar).toContain("fill='#7a7a7a'")
    expect(latar).toContain("fill-opacity='0.1'")
    expect(decodeURIComponent(capAir('x'))).toContain("fill='#000' fill-opacity='0.14'")
  })

  it('dosen tidak diberi watermark', () => {
    auth.role = 'dosen'
    render(<CapTes />)
    expect(document.body.querySelector('[data-testid="cap-tes"]')).toBeNull()
  })
})
