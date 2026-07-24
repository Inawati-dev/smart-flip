// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  generateClassCode,
  createKelas,
  getKelasByDosen,
  deleteKelas,
  summarizeKelas,
  parseImportCsv,
  importMahasiswaCSV,
  type KelasWithCount,
} from './kelas'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars
// set), so every call below exercises the localStorage fallback path —
// matches the existing precedent in manajemen.test.ts / forum.test.ts.

beforeEach(() => {
  localStorage.clear()
})

describe('generateClassCode', () => {
  it('generates a 6-character uppercase alphanumeric code by default', () => {
    const code = generateClassCode()
    expect(code).toHaveLength(6)
    expect(code).toMatch(/^[A-Z0-9]+$/)
  })

  it('never includes visually ambiguous characters (0/O, 1/I/L)', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateClassCode()
      expect(code).not.toMatch(/[01OIL]/)
    }
  })

  it('respects a custom length', () => {
    expect(generateClassCode(8)).toHaveLength(8)
  })

  it('is randomized across calls', () => {
    const codes = new Set(Array.from({ length: 30 }, () => generateClassCode()))
    expect(codes.size).toBeGreaterThan(1)
  })
})

describe('createKelas (localStorage fallback)', () => {
  it('creates a kelas with a generated code and echoes the input fields', async () => {
    const kelas = await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    expect(kelas.name).toBe('Kelas A')
    expect(kelas.angkatan).toBe(2026)
    expect(kelas.max_students).toBe(40)
    expect(kelas.dosen_id).toBe('dosen-1')
    expect(kelas.code).toMatch(/^[A-Z0-9]{6}$/)
    expect(kelas.id).toBeTruthy()
  })

  it('trims the name', async () => {
    const kelas = await createKelas({ name: '  Kelas B  ', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    expect(kelas.name).toBe('Kelas B')
  })

  it('rejects an empty name', async () => {
    await expect(createKelas({ name: '   ', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })).rejects.toThrow()
  })

  it('rejects a non-positive max capacity', async () => {
    await expect(createKelas({ name: 'Kelas C', angkatan: 2026, maxStudents: 0, dosenId: 'dosen-1' })).rejects.toThrow()
  })

  it('rejects an out-of-range angkatan', async () => {
    await expect(createKelas({ name: 'Kelas D', angkatan: 1899, maxStudents: 40, dosenId: 'dosen-1' })).rejects.toThrow()
  })

  it('persists across getKelasByDosen, newest first', async () => {
    await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    await createKelas({ name: 'Kelas B', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    const list = await getKelasByDosen('dosen-1')
    expect(list.map((k) => k.name)).toEqual(['Kelas B', 'Kelas A'])
  })
})

describe('getKelasByDosen (localStorage fallback)', () => {
  it('returns an empty array when nothing is saved yet', async () => {
    expect(await getKelasByDosen('dosen-1')).toEqual([])
  })

  it('only returns classes belonging to the given dosen', async () => {
    await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    await createKelas({ name: 'Kelas X', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-2' })
    const list = await getKelasByDosen('dosen-1')
    expect(list).toHaveLength(1)
    expect(list[0].name).toBe('Kelas A')
  })

  it('always reports studentCount 0 in demo mode (documented limitation)', async () => {
    await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    const list = await getKelasByDosen('dosen-1')
    expect(list[0].studentCount).toBe(0)
  })
})

describe('deleteKelas (localStorage fallback)', () => {
  it('removes the kelas so it no longer appears in getKelasByDosen', async () => {
    const kelas = await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    await deleteKelas(kelas.id)
    expect(await getKelasByDosen('dosen-1')).toEqual([])
  })

  it('leaves other classes untouched', async () => {
    const a = await createKelas({ name: 'Kelas A', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    await createKelas({ name: 'Kelas B', angkatan: 2026, maxStudents: 40, dosenId: 'dosen-1' })
    await deleteKelas(a.id)
    const list = await getKelasByDosen('dosen-1')
    expect(list.map((k) => k.name)).toEqual(['Kelas B'])
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

describe('parseImportCsv', () => {
  it('skips the header row and parses nama,nim,email', () => {
    const csv = 'nama,nim,email\nBudi Santoso,220101,budi@kampus.ac.id\nSiti Aminah,220102,siti@kampus.ac.id'
    const rows = parseImportCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({ nama: 'Budi Santoso', nim: '220101', email: 'budi@kampus.ac.id', valid: true })
    expect(rows[1]).toMatchObject({ nama: 'Siti Aminah', nim: '220102', email: 'siti@kampus.ac.id', valid: true })
  })

  it('lowercases email and trims whitespace around cells', () => {
    const csv = 'nama,nim,email\n  Budi  ,  220101 ,  BUDI@KAMPUS.AC.ID  '
    const rows = parseImportCsv(csv)
    expect(rows[0]).toMatchObject({ nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id' })
  })

  it('flags a row with empty nama as invalid', () => {
    const csv = 'nama,nim,email\n,220101,budi@kampus.ac.id'
    const rows = parseImportCsv(csv)
    expect(rows[0].valid).toBe(false)
    expect(rows[0].reason).toMatch(/nama/i)
  })

  it('flags a row with empty nim as invalid', () => {
    const csv = 'nama,nim,email\nBudi,,budi@kampus.ac.id'
    const rows = parseImportCsv(csv)
    expect(rows[0].valid).toBe(false)
    expect(rows[0].reason).toMatch(/nim/i)
  })

  it('flags a row with a malformed email as invalid', () => {
    const csv = 'nama,nim,email\nBudi,220101,not-an-email'
    const rows = parseImportCsv(csv)
    expect(rows[0].valid).toBe(false)
    expect(rows[0].reason).toMatch(/email/i)
  })

  it('respects double-quoted fields containing a comma', () => {
    const csv = 'nama,nim,email\n"Budi, S.Kom",220101,budi@kampus.ac.id'
    const rows = parseImportCsv(csv)
    expect(rows[0].nama).toBe('Budi, S.Kom')
    expect(rows[0].valid).toBe(true)
  })

  it('ignores blank lines and assigns 1-based line numbers accounting for the header', () => {
    const csv = 'nama,nim,email\n\nBudi,220101,budi@kampus.ac.id\n\nSiti,220102,siti@kampus.ac.id'
    const rows = parseImportCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].line).toBe(2)
    expect(rows[1].line).toBe(3)
  })

  it('returns an empty array for a CSV with only a header', () => {
    expect(parseImportCsv('nama,nim,email')).toEqual([])
  })
})

describe('importMahasiswaCSV (no Supabase configured)', () => {
  it('rejects outright -- no demo/localStorage mode for real account creation', async () => {
    await expect(importMahasiswaCSV('class-1', [{ nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id' }])).rejects.toThrow(
      /Supabase/,
    )
  })

  it('rejects an empty student list too', async () => {
    await expect(importMahasiswaCSV('class-1', [])).rejects.toThrow()
  })
})
