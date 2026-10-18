// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #255: penanda "Lanjut tanpa tes" lama di peramban tidak boleh membuka materi bila bank soal sudah terisi.
const h = vi.hoisted(() => ({ count: 0, galat: null as null | { message: string } }))
vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ eq: async () => ({ count: h.count, error: h.galat }) }) }) }),
  },
}))
vi.mock('../hooks/useModules', () => ({ useModules: () => ({ data: [] }) }))
vi.mock('../hooks/useQuizAttempts', () => ({ useAllQuizAttempts: () => ({ data: [] }) }))
vi.mock('../contexts/CourseContext', () => ({ useCourse: () => ({ courseId: 1 }) }))

import { lewatiPreBerlaku } from './topik'

describe('lewatiPreBerlaku', () => {
  beforeEach(() => localStorage.clear())

  it('tanpa penanda: tidak berlaku', async () => {
    expect(await lewatiPreBerlaku(1)).toBe(false)
  })
  it('penanda ada dan bank soal kosong: berlaku', async () => {
    localStorage.setItem('sfp_pretest_skip', '1')
    h.count = 0
    expect(await lewatiPreBerlaku(1)).toBe(true)
  })
  it('penanda ada tetapi bank soal sudah terisi: tidak berlaku dan penanda dibuang', async () => {
    localStorage.setItem('sfp_pretest_skip', '1')
    h.count = 60
    expect(await lewatiPreBerlaku(1)).toBe(false)
    expect(localStorage.getItem('sfp_pretest_skip')).toBeNull()
  })
  it('galat saat menghitung soal: penanda tetap berlaku supaya tidak berputar', async () => {
    localStorage.setItem('sfp_pretest_skip', '1')
    h.galat = { message: 'Failed to fetch' }
    expect(await lewatiPreBerlaku(1)).toBe(true)
    expect(localStorage.getItem('sfp_pretest_skip')).toBe('1')
    h.galat = null
  })
})
