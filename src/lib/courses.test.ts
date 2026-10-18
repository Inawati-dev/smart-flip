import { describe, it, expect } from 'vitest'
import { buatKodeAcak, cekKodeMataKuliah, getKodeMataKuliah, kodeMataKuliahSah, rapikanKodeMataKuliah, setKodeMataKuliah } from './courses'

// Kode mata kuliah untuk mendaftar (antrean #228). Aturan bentuknya harus sama
// dengan set_course_code di database/migration_v40_kelas_otomatis.sql.
describe('kodeMataKuliahSah', () => {
  it('menerima 6-20 huruf, angka, atau tanda hubung, tanpa peduli huruf kecil dan spasi tepi', () => {
    expect(kodeMataKuliahSah('MPP-2026')).toBe(true)
    expect(kodeMataKuliahSah('  mpp-2026 ')).toBe(true)
    expect(kodeMataKuliahSah('ABCDEF')).toBe(true)
    expect(kodeMataKuliahSah('A'.repeat(20))).toBe(true)
  })
  it('menolak terlalu pendek, terlalu panjang, dan tanda selain tanda hubung', () => {
    expect(kodeMataKuliahSah('ABCDE')).toBe(false)
    expect(kodeMataKuliahSah('A'.repeat(21))).toBe(false)
    expect(kodeMataKuliahSah('MPP 2026')).toBe(false)
    expect(kodeMataKuliahSah('MPP_2026')).toBe(false)
    expect(kodeMataKuliahSah('')).toBe(false)
  })
  it('rapikanKodeMataKuliah memangkas spasi dan menjadikan kapital', () => {
    expect(rapikanKodeMataKuliah('  mpp-26 ')).toBe('MPP-26')
  })
})

describe('buatKodeAcak', () => {
  it('8 karakter, selalu lolos aturan kode, tanpa huruf yang mirip angka', () => {
    for (let i = 0; i < 50; i++) {
      const k = buatKodeAcak()
      expect(k).toHaveLength(8)
      expect(kodeMataKuliahSah(k)).toBe(true)
      expect(k).not.toMatch(/[01OIL]/)
    }
  })
})

describe('mode demo (tanpa Supabase)', () => {
  it('cek kode tidak memblokir, baca kode kosong, simpan kode menolak dengan pesan jelas', async () => {
    expect(await cekKodeMataKuliah('MPP-2026')).toBe('belum_bisa_dicek')
    expect(await getKodeMataKuliah(1)).toBeNull()
    await expect(setKodeMataKuliah(1, 'MPP-2026')).rejects.toThrow(/mode demo/)
  })
})
