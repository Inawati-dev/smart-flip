// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  getKelasByDosen,
  kelasUntukMataKuliah,
  summarizeKelas,
  labelKelas,
  tahunUnik,
  namaKelasUnik,
  cocokFilter,
  kelompokkanGolongan,
  type KelasWithCount,
} from './kelas'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars
// set), so every call below exercises the demo path.

beforeEach(() => {
  localStorage.clear()
})

// Antrean #228: kelas dibentuk basis data dari tes diagnostik; mode demo tidak punya kelas.
describe('getKelasByDosen (mode demo)', () => {
  it('mengembalikan daftar kosong', async () => {
    expect(await getKelasByDosen('dosen-1')).toEqual([])
  })
})

describe('kelasUntukMataKuliah', () => {
  const k = (id: string, o: Partial<KelasWithCount>): KelasWithCount => ({
    id, name: id, angkatan: 2026, code: id, dosen_id: 'd', max_students: 25, created_at: '', studentCount: 0, ...o,
  })
  const semua = [
    k('JC-B', { course_id: 1, golongan: 'mahir', urutan: 2 }),
    k('lama', { golongan: null, course_id: null, max_students: 40 }),
    k('JC-A', { course_id: 1, golongan: 'mahir', urutan: 1 }),
    k('PD-A', { course_id: 2, golongan: 'mahir', urutan: 1 }),
    k('BM-A', { course_id: 1, golongan: 'remedial', urutan: 1 }),
    k('JC-A-2025', { course_id: 1, golongan: 'mahir', urutan: 1, angkatan: 2025 }),
  ]
  it('hanya kelas otomatis mata kuliah itu ditambah kelas lama, urut angkatan, Belajar Mendalam, Jalur Cepat A, B, lalu kelas lama', () => {
    expect(kelasUntukMataKuliah(semua, 1).map((x) => x.id)).toEqual(['BM-A', 'JC-A', 'JC-B', 'lama', 'JC-A-2025'])
  })
  it('mata kuliah lain tidak tercampur', () => {
    expect(kelasUntukMataKuliah(semua, 2).map((x) => x.id)).toEqual(['PD-A', 'lama'])
  })
  it('tidak mengubah urutan larik asal', () => {
    const salinan = semua.map((x) => x.id)
    kelasUntukMataKuliah(semua, 1)
    expect(semua.map((x) => x.id)).toEqual(salinan)
  })
})

describe('summarizeKelas', () => {
  function withCount(overrides: Partial<KelasWithCount>): KelasWithCount {
    return {
      id: 'id',
      name: 'name',
      angkatan: 2026,
      code: 'ABC123',
      dosen_id: 'dosen-1',
      max_students: 40,
      created_at: new Date().toISOString(),
      studentCount: 0,
      ...overrides,
    }
  }

  it('sums studentCount across all classes', () => {
    const summary = summarizeKelas([withCount({ studentCount: 23 }), withCount({ studentCount: 17 })])
    expect(summary.totalStudents).toBe(40)
  })

  it('groups by angkatan, sorted newest first', () => {
    const summary = summarizeKelas([
      withCount({ angkatan: 2024, studentCount: 10 }),
      withCount({ angkatan: 2026, studentCount: 5 }),
      withCount({ angkatan: 2024, studentCount: 8 }),
    ])
    expect(summary.byAngkatan).toEqual([
      { angkatan: 2026, total: 5 },
      { angkatan: 2024, total: 18 },
    ])
  })

  it('returns zeroed summary for an empty list', () => {
    expect(summarizeKelas([])).toEqual({ totalStudents: 0, byAngkatan: [] })
  })
})

describe('labelKelas', () => {
  it('formats as "nama · angkatan" when no duplicate exists', () => {
    expect(labelKelas({ name: 'Kelas A', angkatan: 2024 })).toBe('Kelas A · 2024')
  })

  it('appends the class code when another kelas shares the same nama+angkatan', () => {
    const semua = [
      { name: 'Kelas A', angkatan: 2024 },
      { name: 'Kelas A', angkatan: 2024 },
    ]
    expect(labelKelas({ name: 'Kelas A', angkatan: 2024, code: 'KLS-A24' }, semua)).toBe('Kelas A · 2024 · KLS-A24')
  })
})

describe('tahunUnik / namaKelasUnik / cocokFilter', () => {
  const KELAS = [
    { name: 'Kelas A', angkatan: 2024 },
    { name: 'Kelas A', angkatan: 2025 },
    { name: 'Kelas B', angkatan: 2026 },
    { name: 'Kelas D', angkatan: 2026 },
  ]

  describe('tahunUnik', () => {
    it('returns unique angkatan sorted descending', () => {
      expect(tahunUnik(KELAS)).toEqual([2026, 2025, 2024])
    })

    it('returns an empty array for an empty list', () => {
      expect(tahunUnik([])).toEqual([])
    })
  })

  describe('namaKelasUnik', () => {
    it('returns every unique nama sorted A-Z when tahun is null', () => {
      expect(namaKelasUnik(KELAS, null)).toEqual(['Kelas A', 'Kelas B', 'Kelas D'])
    })

    it('narrows to nama kelas that exist in the given tahun', () => {
      expect(namaKelasUnik(KELAS, 2026)).toEqual(['Kelas B', 'Kelas D'])
      expect(namaKelasUnik(KELAS, 2024)).toEqual(['Kelas A'])
    })

    it('returns an empty array for a tahun with no classes', () => {
      expect(namaKelasUnik(KELAS, 1999)).toEqual([])
    })
  })

  describe('cocokFilter', () => {
    it('matches everything when both tahun and kelas are null', () => {
      for (const k of KELAS) expect(cocokFilter(k, { tahun: null, kelas: null })).toBe(true)
    })

    it('filters by tahun alone', () => {
      expect(cocokFilter({ name: 'Kelas B', angkatan: 2026 }, { tahun: 2026, kelas: null })).toBe(true)
      expect(cocokFilter({ name: 'Kelas A', angkatan: 2024 }, { tahun: 2026, kelas: null })).toBe(false)
    })

    it('filters by kelas alone', () => {
      expect(cocokFilter({ name: 'Kelas A', angkatan: 2024 }, { tahun: null, kelas: 'Kelas A' })).toBe(true)
      expect(cocokFilter({ name: 'Kelas A', angkatan: 2025 }, { tahun: null, kelas: 'Kelas A' })).toBe(true)
      expect(cocokFilter({ name: 'Kelas B', angkatan: 2026 }, { tahun: null, kelas: 'Kelas A' })).toBe(false)
    })

    it('requires both to match when both are set', () => {
      expect(cocokFilter({ name: 'Kelas A', angkatan: 2024 }, { tahun: 2024, kelas: 'Kelas A' })).toBe(true)
      expect(cocokFilter({ name: 'Kelas A', angkatan: 2025 }, { tahun: 2024, kelas: 'Kelas A' })).toBe(false)
    })
  })
})

// Antrean #140: dua kelompok hasil tes diagnostik per kelas, batas 80.
describe('kelompokkanGolongan', () => {
  it('memakai skor terakhir, memisah per kelas, dan menandai yang belum tes', () => {
    const hasil = kelompokkanGolongan(
      [
        { id: 'u1', full_name: 'Budi', class_id: 'A' },
        { id: 'u2', full_name: 'Ani', class_id: 'A' },
        { id: 'u3', full_name: null, class_id: 'A' },
        { id: 'u4', full_name: 'Cici', class_id: 'B' },
        { id: 'u5', full_name: 'Tanpa Kelas', class_id: null },
      ],
      [
        { user_id: 'u1', score: 40 },
        { user_id: 'u1', score: 80 },
        { user_id: 'u2', score: 79 },
        { user_id: 'u4', score: 100 },
        { user_id: 'orang-luar', score: 90 },
      ],
    )
    expect(Object.keys(hasil).sort()).toEqual(['A', 'B'])
    expect(hasil.A.map((a) => [a.nama, a.skor, a.golongan])).toEqual([
      ['Ani', 79, 'remedial'],
      ['Budi', 80, 'mahir'],
      ['Tanpa nama', null, 'belum'],
    ])
    expect(hasil.B).toEqual([{ id: 'u4', nama: 'Cici', skor: 100, golongan: 'mahir' }])
  })
})
