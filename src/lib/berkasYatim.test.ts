import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #168: berkas hanya dibuang bila tidak ada topik lain yang menunjuknya.
const h = vi.hoisted(() => ({
  dipakai: {} as Record<string, number | null>, // alamat -> jumlah topik yang masih menunjuk; null = hitungan gagal
  dibuang: [] as Array<[string, string]>, // [bucket, nama berkas]
}))

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      select: () => ({
        eq: async (_kolom: string, url: string) => {
          const n = h.dipakai[url]
          return n === null ? { count: null, error: { message: 'gagal' } } : { count: n ?? 0, error: null }
        },
      }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: async (nama: string[]) => {
          h.dibuang.push([bucket, nama[0]])
          return { error: null }
        },
      }),
    },
  },
}))

import { buangBerkasYatim } from './manajemen'

const PDF = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/modul-1-111.pdf'
const PDF_BERSAMA = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/bersama.pdf'
const VIDEO = 'https://x.supabase.co/storage/v1/object/public/modul-video/video%201.mp4'

beforeEach(() => {
  h.dipakai = {}
  h.dibuang = []
})

describe('buangBerkasYatim', () => {
  it('membuang PDF dan video yang tidak ditunjuk topik mana pun', async () => {
    await buangBerkasYatim([PDF, VIDEO, null, undefined, PDF])
    expect(h.dibuang).toEqual([
      ['modul-pdf', 'modul-1-111.pdf'],
      ['modul-video', 'video 1.mp4'],
    ])
  })

  it('membiarkan berkas yang masih dipakai topik lain', async () => {
    h.dipakai[PDF_BERSAMA] = 1
    await buangBerkasYatim([PDF_BERSAMA, PDF])
    expect(h.dibuang).toEqual([['modul-pdf', 'modul-1-111.pdf']])
  })

  it('tidak menghapus bila hitungan pemakai gagal dibaca', async () => {
    h.dipakai[PDF] = null
    await buangBerkasYatim([PDF])
    expect(h.dibuang).toEqual([])
  })

  it('mengabaikan alamat di luar bucket (YouTube, berkas bawaan repo)', async () => {
    await buangBerkasYatim(['https://youtu.be/abc', '/books/modul-01.pdf'])
    expect(h.dibuang).toEqual([])
  })
})
