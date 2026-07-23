// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  computeModulDistribution,
  computeFeedbackAspectAvg,
  computeStudentStatus,
  computeInactiveStudents,
  bucketKuisDist,
  computeStatSummary,
  sortStudents,
  buildAnalitikCsv,
  downloadCsv,
  fetchStudentStats,
  fetchModulDistribution,
  fetchFeedbackAspectAvg,
  DUMMY_STUDENTS,
  type StudentStat,
} from './analitik'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// matching the precedent in feedback.test.ts / progress.test.ts.

describe('computeModulDistribution', () => {
  it('matches tests/data-layer.compute.test.cjs reference: % students completed per module', () => {
    const modules = [
      { id: 10, order_num: 1 },
      { id: 20, order_num: 2 },
    ]
    const totalStudents = 4
    const completedRows = [
      { module_id: 10 },
      { module_id: 10 },
      { module_id: 10 }, // 3/4 = 75%
      { module_id: 20 }, // 1/4 = 25%
    ]
    expect(computeModulDistribution(modules, totalStudents, completedRows)).toEqual([
      { label: 'Modul 1', pct: 75 },
      { label: 'Modul 2', pct: 25 },
    ])
  })
})

describe('computeFeedbackAspectAvg', () => {
  it('matches tests/data-layer.compute.test.cjs reference: averages each aspect', () => {
    const rows = [
      { konten: 4, kemudahan: 4, keterbacaan: 5, kebermanfaatan: 5 },
      { konten: 2, kemudahan: 4, keterbacaan: 3, kebermanfaatan: 3 },
    ]
    expect(computeFeedbackAspectAvg(rows)).toEqual([
      { label: 'Kualitas Konten', nilai: 3 },
      { label: 'Kemudahan Penggunaan', nilai: 4 },
      { label: 'Keterbacaan', nilai: 4 },
      { label: 'Kebermanfaatan', nilai: 4 },
    ])
  })

  it('returns all zeros when there are no rows', () => {
    expect(computeFeedbackAspectAvg([])).toEqual([
      { label: 'Kualitas Konten', nilai: 0 },
      { label: 'Kemudahan Penggunaan', nilai: 0 },
      { label: 'Keterbacaan', nilai: 0 },
      { label: 'Kebermanfaatan', nilai: 0 },
    ])
  })
})

describe('computeStudentStatus', () => {
  it('flags a student inactive when time spent is zero hours, matching legacy getStudentStats', () => {
    expect(computeStudentStatus(0)).toBe('tidak')
  })
  it('flags a student active when time spent is above zero', () => {
    expect(computeStudentStatus(0.1)).toBe('aktif')
    expect(computeStudentStatus(4.2)).toBe('aktif')
  })
})

describe('computeInactiveStudents', () => {
  it('filters only students flagged tidak aktif', () => {
    const flagged = computeInactiveStudents(DUMMY_STUDENTS)
    expect(flagged.map((s) => s.nama)).toEqual(['Dian Pratama', 'Gita Rahayu', 'Joko Susanto'])
  })
})

describe('bucketKuisDist', () => {
  it('buckets students into the 5 legacy score ranges, skipping students with no attempt', () => {
    const buckets = bucketKuisDist(DUMMY_STUDENTS)
    const byLabel = Object.fromEntries(buckets.map((b) => [b.label, b.count]))
    // DUMMY_STUDENTS kuis scores: 78,85,72,60,90,68,0,82,75,55 (0 excluded)
    expect(byLabel['0–59']).toBe(1) // 55
    expect(byLabel['60–69']).toBe(2) // 60, 68
    expect(byLabel['70–79']).toBe(3) // 78, 72, 75
    expect(byLabel['80–89']).toBe(2) // 85, 82
    expect(byLabel['90–100']).toBe(1) // 90
  })
})

describe('computeStatSummary', () => {
  it('computes the 4 stat-card values, matching legacy computeStatCards()', () => {
    const students: StudentStat[] = [
      { id: 1, nama: 'A', modul: 9, kuis: 80, jam: 1, kepraktisan: 4, status: 'aktif' },
      { id: 2, nama: 'B', modul: 0, kuis: 0, jam: 0, kepraktisan: null, status: 'tidak' },
    ]
    const summary = computeStatSummary(students, 9)
    expect(summary.totalAktif).toBe(1)
    expect(summary.totalStudents).toBe(2)
    expect(summary.avgModulPct).toBe(50) // avg modul (9+0)/2=4.5, /9*100=50
    expect(summary.avgKuis).toBe(80) // only student A has kuis>0
    expect(summary.avgKepraktisan).toBe(4)
  })

  it('handles an empty roster without dividing by zero', () => {
    const summary = computeStatSummary([], 9)
    expect(summary).toEqual({ totalAktif: 0, totalStudents: 0, avgModulPct: 0, avgKuis: 0, avgKepraktisan: 0 })
  })
})

describe('sortStudents', () => {
  it('sorts by nama ascending/descending', () => {
    const asc = sortStudents(DUMMY_STUDENTS, 'nama', true)
    expect(asc[0].nama).toBe('Ahmad Rizki')
    const desc = sortStudents(DUMMY_STUDENTS, 'nama', false)
    expect(desc[0].nama).toBe('Joko Susanto')
  })

  it('sorts by kuis numerically', () => {
    const asc = sortStudents(DUMMY_STUDENTS, 'kuis', true)
    expect(asc[0].kuis).toBe(0)
    expect(asc[asc.length - 1].kuis).toBe(90)
  })

  it('always sorts null kepraktisan to the end regardless of direction', () => {
    const asc = sortStudents(DUMMY_STUDENTS, 'kepraktisan', true)
    expect(asc[asc.length - 1].kepraktisan).toBeNull()
    const desc = sortStudents(DUMMY_STUDENTS, 'kepraktisan', false)
    expect(desc[desc.length - 1].kepraktisan).toBeNull()
  })

  it('reverses order without re-sorting for the "no" column', () => {
    const reversed = sortStudents(DUMMY_STUDENTS, 'no', false)
    expect(reversed[0].nama).toBe(DUMMY_STUDENTS[DUMMY_STUDENTS.length - 1].nama)
  })

  it('does not mutate the input array', () => {
    const copy = [...DUMMY_STUDENTS]
    sortStudents(DUMMY_STUDENTS, 'kuis', true)
    expect(DUMMY_STUDENTS).toEqual(copy)
  })
})

describe('buildAnalitikCsv', () => {
  it('escapes commas and quotes in student names correctly', () => {
    const students: StudentStat[] = [
      { id: 1, nama: 'Budi, S.Kom "Bud"', modul: 2, kuis: 80, jam: 3, kepraktisan: 4.5, status: 'aktif' },
    ]
    const csv = buildAnalitikCsv(students)
    // A name containing a comma must stay inside one quoted field, and an
    // embedded quote must be doubled per RFC 4180 / legacy exportCSV().
    expect(csv).toContain('"Budi, S.Kom ""Bud"""')
  })

  it('produces the legacy header row and per-student data rows', () => {
    const csv = buildAnalitikCsv(DUMMY_STUDENTS)
    const lines = csv.split('\n')
    expect(lines[0]).toBe('No,Nama,Modul Selesai,Avg Kuis,Waktu (jam),Kepraktisan,Status')
    expect(lines[1]).toBe('1,"Ahmad Rizki",3,78,4.2,4.2,Aktif')
    expect(csv).toContain('Ringkasan')
    expect(csv).toContain('Mahasiswa Aktif,7')
  })

  it('renders an empty kepraktisan cell (not "null") for students without a rating', () => {
    const csv = buildAnalitikCsv(DUMMY_STUDENTS)
    expect(csv).toContain('0,0.5,,Tidak Aktif') // Gita Rahayu row: kepraktisan null
  })

  it('handles an empty roster gracefully', () => {
    const csv = buildAnalitikCsv([])
    expect(csv).toContain('Rata-rata Skor Kuis,—')
    expect(csv).toContain('Rata-rata Kepraktisan,—')
  })
})

describe('downloadCsv', () => {
  it('creates an object URL, triggers an anchor click, and revokes the URL', () => {
    const originalCreate = URL.createObjectURL
    const originalRevoke = URL.revokeObjectURL
    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    URL.createObjectURL = createObjectURL as typeof URL.createObjectURL
    URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    downloadCsv('test.csv', 'a,b,c\n1,2,3\n')

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
    URL.createObjectURL = originalCreate
    URL.revokeObjectURL = originalRevoke
  })
})

describe('fetchStudentStats / fetchModulDistribution / fetchFeedbackAspectAvg (Supabase not configured)', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('all resolve to null so the page falls back to DUMMY_* data', async () => {
    expect(await fetchStudentStats()).toBeNull()
    expect(await fetchModulDistribution()).toBeNull()
    expect(await fetchFeedbackAspectAvg()).toBeNull()
  })
})
