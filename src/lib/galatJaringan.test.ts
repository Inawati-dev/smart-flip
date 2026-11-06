import { describe, it, expect } from 'vitest'
import { pesanGalat, PESAN_JARINGAN } from './galatJaringan'

describe('pesanGalat', () => {
  it('galat jaringan semua peramban jadi pesan Indonesia', () => {
    for (const m of ['Failed to fetch', 'TypeError: Failed to fetch', 'Load failed', 'NetworkError when attempting to fetch resource.', 'fetch failed', 'Network request failed']) {
      expect(pesanGalat(m)).toBe(PESAN_JARINGAN)
    }
  })

  it('galat lain tidak diubah', () => {
    expect(pesanGalat('Invalid login credentials')).toBe('Invalid login credentials')
    expect(pesanGalat('Email ini sudah terdaftar. Silakan masuk.')).toBe('Email ini sudah terdaftar. Silakan masuk.')
    expect(pesanGalat('')).toBe('')
  })
})
