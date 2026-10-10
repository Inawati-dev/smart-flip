import { describe, it, expect } from 'vitest'
import { ambangDari } from './ambang'

// Antrean #136: batas skor per mata kuliah, bawaan 80 (diagnostik) dan 70 (formatif).
describe('ambangDari', () => {
  it('memakai bawaan bila mata kuliah kosong atau kolomnya belum ada', () => {
    expect(ambangDari(null)).toEqual({ diagnostik: 80, formatif: 70 })
    expect(ambangDari({})).toEqual({ diagnostik: 80, formatif: 70 })
    expect(ambangDari({ ambang_diagnostik: null, ambang_formatif: null })).toEqual({ diagnostik: 80, formatif: 70 })
  })

  it('memakai setelan mata kuliah, termasuk angka 0', () => {
    expect(ambangDari({ ambang_diagnostik: 75, ambang_formatif: 60 })).toEqual({ diagnostik: 75, formatif: 60 })
    expect(ambangDari({ ambang_diagnostik: 0, ambang_formatif: 0 })).toEqual({ diagnostik: 0, formatif: 0 })
  })
})
