import { describe, it, expect, vi, afterEach } from 'vitest'

vi.mock('./supabase', () => ({ isSupabaseConfigured: false, supabase: {} }))
import { urlSampulVideo, detikBingkai, terangRata, terlaluGelap, urutanDetik, terangSumber } from './sampulVideo'

// Antrean #293: sampul hitam.
const piksel = (r: number, g: number, b: number, n = 4) => Uint8ClampedArray.from(Array.from({ length: n }, () => [r, g, b, 255]).flat())

describe('terangRata dan terlaluGelap', () => {
  it('hitam = 0, putih = 255', () => {
    expect(terangRata(piksel(0, 0, 0))).toBe(0)
    expect(terangRata(piksel(255, 255, 255))).toBeCloseTo(255, 5)
    expect(terangRata([])).toBe(0)
  })
  it('ambang 16: hitam gelap, abu-abu sedang tidak', () => {
    expect(terlaluGelap(terangRata(piksel(5, 5, 5)))).toBe(true)
    expect(terlaluGelap(terangRata(piksel(16, 16, 16)))).toBe(false)
    expect(terlaluGelap(terangRata(piksel(120, 120, 120)))).toBe(false)
  })
})

describe('urutanDetik', () => {
  it('video panjang: 5, 10%, 25%, 50%', () => {
    expect(urutanDetik(400)).toEqual([5, 40, 100, 200])
  })
  it('video pendek: tanpa detik kembar', () => {
    expect(urutanDetik(20)).toEqual([2, 5, 10])
  })
  it('durasi tidak sah = [0]', () => {
    expect(urutanDetik(NaN)).toEqual([0])
  })
})

describe('terangSumber', () => {
  afterEach(() => vi.unstubAllGlobals())
  const pakaiKanvas = (data: Uint8ClampedArray) =>
    vi.stubGlobal('document', {
      createElement: () => ({ getContext: () => ({ drawImage: () => {}, getImageData: () => ({ data }) }) }),
    })
  it('bingkai gelap ditolak', () => {
    pakaiKanvas(piksel(2, 2, 2))
    expect(terlaluGelap(terangSumber({} as CanvasImageSource))).toBe(true)
  })
  it('bingkai terang dipakai', () => {
    pakaiKanvas(piksel(200, 180, 160))
    expect(terlaluGelap(terangSumber({} as CanvasImageSource))).toBe(false)
  })
})

// Antrean #275: gambar kecil video unggahan.
describe('urlSampulVideo', () => {
  it('video di bucket modul-video mendapat alamat .sampul.jpg tanpa query', () => {
    expect(urlSampulVideo('https://x.supabase.co/storage/v1/object/public/modul-video/topik-1-p2-9.mp4?t=1')).toBe(
      'https://x.supabase.co/storage/v1/object/public/modul-video/topik-1-p2-9.mp4.sampul.jpg',
    )
  })
  it('YouTube, alamat lain, atau kosong tidak punya gambar unggahan', () => {
    expect(urlSampulVideo('https://youtu.be/dQw4w9WgXcQ')).toBeNull()
    expect(urlSampulVideo('https://contoh.id/video.mp4')).toBeNull()
    expect(urlSampulVideo(null)).toBeNull()
  })
})

describe('detikBingkai', () => {
  it('detik ke-5 untuk video panjang, sepersepuluh durasi untuk video pendek', () => {
    expect(detikBingkai(420)).toBe(5)
    expect(detikBingkai(20)).toBe(2)
  })
  it('durasi tidak sah jatuh ke detik 0', () => {
    expect(detikBingkai(NaN)).toBe(0)
    expect(detikBingkai(Infinity)).toBe(0)
    expect(detikBingkai(0)).toBe(0)
  })
})
