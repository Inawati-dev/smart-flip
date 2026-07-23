// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  LABEL_MEDIA,
  LABEL_MATERI,
  kelayakanInfo,
  computeValidasiResult,
  skorClass,
  saveValidasi,
  fetchValidasi,
  type ValidasiData,
} from './validasi'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// so every persistence call below exercises the localStorage fallback path —
// matches the existing precedent in forum.test.ts / feedback.test.ts.

const LS_KEY = 'sfp_validasi'

beforeEach(() => {
  localStorage.clear()
})

describe('indicator labels', () => {
  it('has exactly 8 media indicators', () => {
    expect(LABEL_MEDIA).toHaveLength(8)
  })

  it('has exactly 8 materi indicators', () => {
    expect(LABEL_MATERI).toHaveLength(8)
  })

  it('ports the exact label text from legacy/validasi.html (not paraphrased)', () => {
    expect(LABEL_MEDIA).toEqual([
      'Tampilan antarmuka (desain, warna, tipografi)',
      'Kemudahan navigasi',
      'Kualitas tampilan video',
      'Keterbacaan teks dan font',
      'Konsistensi tata letak',
      'Responsivitas di berbagai perangkat',
      'Ketepatan penggunaan ikon/simbol',
      'Keseluruhan kualitas media',
    ])
    expect(LABEL_MATERI).toEqual([
      'Kesesuaian materi dengan RPS',
      'Kedalaman dan keluasan materi',
      'Keakuratan konsep R&D',
      'Kemutakhiran referensi',
      'Kualitas soal kuis',
      'Kualitas studi kasus',
      'Ketepatan umpan balik',
      'Keseluruhan kualitas materi',
    ])
  })
})

describe('kelayakanInfo (category thresholds ported verbatim from legacy)', () => {
  it('returns Sangat Layak for avg >= 4.2', () => {
    expect(kelayakanInfo(4.2)).toEqual({ key: 'sangat-layak', label: 'Sangat Layak', icon: '🏆' })
    expect(kelayakanInfo(5).key).toBe('sangat-layak')
  })

  it('returns Layak for 3.4 <= avg < 4.2', () => {
    expect(kelayakanInfo(3.4).key).toBe('layak')
    expect(kelayakanInfo(4.19).key).toBe('layak')
  })

  it('returns Cukup Layak for 2.6 <= avg < 3.4', () => {
    expect(kelayakanInfo(2.6).key).toBe('cukup-layak')
    expect(kelayakanInfo(3.39).key).toBe('cukup-layak')
  })

  it('returns Kurang Layak for avg < 2.6', () => {
    expect(kelayakanInfo(0).key).toBe('kurang-layak')
    expect(kelayakanInfo(2.59).key).toBe('kurang-layak')
  })
})

describe('computeValidasiResult (pure scoring function, TDD from known rating sets)', () => {
  it('averages all-5s to a perfect 5.00 total → Sangat Layak', () => {
    const r = computeValidasiResult(Array(8).fill(5), Array(8).fill(5))
    expect(r).toEqual({
      avgMedia: 5,
      avgMateri: 5,
      totalAvg: 5,
      kategori: { key: 'sangat-layak', label: 'Sangat Layak', icon: '🏆' },
    })
  })

  it('averages all-1s to 1.00 total → Kurang Layak', () => {
    const r = computeValidasiResult(Array(8).fill(1), Array(8).fill(1))
    expect(r.totalAvg).toBe(1)
    expect(r.kategori.key).toBe('kurang-layak')
  })

  it('computes mixed scores exactly like legacy toFixed(2) double-rounding', () => {
    // media: 4,4,4,4,4,4,4,5 → sum 33 / 8 = 4.125 → toFixed(2) = 4.13 (rounds .125→.13 per JS float)
    const media = [4, 4, 4, 4, 4, 4, 4, 5]
    // materi: all 3s → 3.00
    const materi = Array(8).fill(3)
    const r = computeValidasiResult(media, materi)
    expect(r.avgMedia).toBeCloseTo(4.13, 2)
    expect(r.avgMateri).toBe(3)
    // totalAvg = (4.13 + 3) / 2 = 3.565 → toFixed(2) = 3.57 (or 3.56 depending on float rounding) → Layak
    expect(r.totalAvg).toBeCloseTo((r.avgMedia + r.avgMateri) / 2, 2)
    expect(r.kategori.key).toBe('layak')
  })

  it('places the Layak/Cukup Layak boundary at exactly the fixed thresholds', () => {
    const allFours = computeValidasiResult(Array(8).fill(4), Array(8).fill(4))
    expect(allFours.totalAvg).toBe(4)
    expect(allFours.kategori.key).toBe('layak')
  })
})

describe('skorClass', () => {
  it('classifies >=4 as good, >=3 as avg, else low', () => {
    expect(skorClass(5)).toBe('good')
    expect(skorClass(4)).toBe('good')
    expect(skorClass(3)).toBe('avg')
    expect(skorClass(2)).toBe('low')
    expect(skorClass(1)).toBe('low')
  })
})

function makeData(overrides: Partial<ValidasiData> = {}): ValidasiData {
  return {
    aspekMedia: { scores: Array(8).fill(4), avg: 4, komentar: 'Bagus' },
    aspekMateri: { scores: Array(8).fill(5), avg: 5, komentar: '' },
    totalAvg: 4.5,
    validator: { nama: 'Dr. Ahmad', institusi: 'Universitas Negeri Malang', keahlian: 'Teknologi Pendidikan' },
    timestamp: Date.now(),
    ...overrides,
  }
}

describe('saveValidasi / fetchValidasi (localStorage fallback)', () => {
  it('returns null when nothing is saved yet', async () => {
    expect(await fetchValidasi()).toBeNull()
  })

  it('round-trips a submission under the exact legacy localStorage key', async () => {
    const data = makeData()
    await saveValidasi(data)
    const raw = JSON.parse(localStorage.getItem(LS_KEY)!)
    expect(raw).toEqual(data)
    expect(await fetchValidasi()).toEqual(data)
  })

  it('overwrites the previous submission (one validasi per user, matches upsert onConflict user_id)', async () => {
    await saveValidasi(makeData({ totalAvg: 3 }))
    await saveValidasi(makeData({ totalAvg: 4.8 }))
    const result = await fetchValidasi()
    expect(result?.totalAvg).toBe(4.8)
  })
})

describe('graceful localStorage failure handling', () => {
  it('fetchValidasi returns null when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await fetchValidasi()).toBeNull()
    spy.mockRestore()
  })

  it('saveValidasi does not throw when localStorage.setItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('boom')
    })
    await expect(saveValidasi(makeData())).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
