import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ isSupabaseConfigured: false, supabase: {} }))

import { AKHIRAN_SAMPUL, buatSampul, urlSampul } from './sampulPdf'

const PDF = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/topik-3-1791.pdf'

describe('urlSampul', () => {
  it('PDF di bucket modul-pdf: alamat sampul = alamat PDF ditambah akhiran, tanpa query', () => {
    expect(urlSampul(PDF)).toBe(PDF + AKHIRAN_SAMPUL)
    expect(urlSampul(PDF + '?t=123')).toBe(PDF + AKHIRAN_SAMPUL)
  })
  it('PDF di luar bucket, alamat kosong, dan blob tidak punya sampul', () => {
    expect(urlSampul('/books/modul-01.pdf')).toBeNull()
    expect(urlSampul('blob:http://localhost/abc')).toBeNull()
    expect(urlSampul(null)).toBeNull()
    expect(urlSampul('')).toBeNull()
  })
})

describe('buatSampul', () => {
  it('tanpa Supabase atau untuk PDF di luar bucket langsung false, tanpa memuat pustaka PDF', async () => {
    expect(await buatSampul(PDF)).toBe(false)
    expect(await buatSampul('/books/modul-01.pdf')).toBe(false)
  })
})
