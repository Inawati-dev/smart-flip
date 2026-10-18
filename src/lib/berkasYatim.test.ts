import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #168: berkas hanya dibuang bila tidak ada topik lain yang menunjuknya.
const h = vi.hoisted(() => ({
  dipakai: {} as Record<string, number | null>, // alamat -> jumlah topik yang masih menunjuk; null = hitungan gagal
  dibuang: [] as Array<[string, string]>, // [bucket, nama berkas]
  lama: null as string | null, // pdf_path topik sebelum diganti
  dipakai2: {} as Record<string, number>, // alamat -> jumlah topik yang menunjuknya di kolom pertemuan kedua (antrean #271)
  tanpaV50: false, // kolom `_2` belum ada (migration_v50 belum dijalankan)
}))

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      select: () => ({
        eq: (kolom: string, url: string) => {
          if (kolom.endsWith('_2')) {
            // Bukan HEAD (temuan pemeriksa #271): galat membawa kode 42703 hanya pada permintaan biasa.
            const hasil = h.tanpaV50
              ? { data: null, error: { code: '42703', message: 'column does not exist' } }
              : { data: Array.from({ length: h.dipakai2[url] ?? 0 }, (_, i) => ({ id: i })), error: null }
            return { limit: async () => hasil, maybeSingle: async () => ({ data: null }) }
          }
          const n = h.dipakai[url]
          const hitung = n === null ? { count: null, error: { message: 'gagal' } } : { count: n ?? 0, error: null }
          return Object.assign(Promise.resolve(hitung), { maybeSingle: async () => ({ data: { pdf_path: h.lama } }) })
        },
      }),
      update: () => ({ eq: async () => ({ error: null }) }),
    }),
    storage: {
      from: (bucket: string) => ({
        remove: async (nama: string[]) => {
          h.dibuang.push([bucket, nama[0]])
          return { error: null }
        },
        upload: async () => ({ error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://x.supabase.co/storage/v1/object/public/${bucket}/${path}` } }),
      }),
    },
  },
}))

import { buangBerkasYatim, uploadModulPdf } from './manajemen'

const PDF = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/modul-1-111.pdf'
const PDF_BERSAMA = 'https://x.supabase.co/storage/v1/object/public/modul-pdf/bersama.pdf'
const VIDEO = 'https://x.supabase.co/storage/v1/object/public/modul-video/video%201.mp4'

beforeEach(() => {
  h.dipakai = {}
  h.dibuang = []
  h.lama = null
  h.dipakai2 = {}
  h.tanpaV50 = false
})

describe('buangBerkasYatim: isian pertemuan kedua (antrean #271)', () => {
  it('membiarkan berkas yang hanya dipakai di kolom pertemuan kedua', async () => {
    h.dipakai2[PDF] = 1
    await buangBerkasYatim([PDF])
    expect(h.dibuang).toEqual([])
  })

  it('tetap membersihkan berkas yatim walau kolom pertemuan kedua belum ada', async () => {
    h.tanpaV50 = true
    await buangBerkasYatim([PDF])
    expect(h.dibuang).toEqual([['modul-pdf', 'modul-1-111.pdf']])
  })
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

// Antrean #194: mengganti PDF satu topik tidak boleh membuang berkas lama yang
// masih dipakai topik lain.
describe('uploadModulPdf', () => {
  const berkas = new File(['x'], 'baru.pdf', { type: 'application/pdf' })

  it('membiarkan PDF lama yang masih dipakai topik lain', async () => {
    h.lama = PDF_BERSAMA
    h.dipakai[PDF_BERSAMA] = 1
    await uploadModulPdf(1, berkas)
    expect(h.dibuang).toEqual([])
  })

  it('membuang PDF lama yang tidak dipakai topik lain', async () => {
    h.lama = PDF
    await uploadModulPdf(1, berkas)
    expect(h.dibuang).toEqual([['modul-pdf', 'modul-1-111.pdf']])
  })
})
