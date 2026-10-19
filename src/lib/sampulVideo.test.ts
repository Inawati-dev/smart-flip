import { describe, it, expect } from 'vitest'
import { urlSampulVideo, detikBingkai } from './sampulVideo'

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
