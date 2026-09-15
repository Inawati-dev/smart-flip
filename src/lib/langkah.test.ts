import { describe, it, expect } from 'vitest'
import { hitungLangkah } from './langkah'
import { moduleIdToPath } from './progress'
import type { QuizAttemptWithModule } from './quizAttempts'

const modules = Array.from({ length: 9 }, (_, i) => ({
  id: i + 1,
  order_num: i + 1,
  title: `Modul ${i + 1}`,
}))

function attempt(moduleId: number, score: number, completedAt: string): QuizAttemptWithModule {
  return { moduleId, score, completedAt, date: completedAt, answers: null }
}

describe('hitungLangkah', () => {
  it('belum apa-apa: topik aktif modul 1, langkah baca', () => {
    const r = hitungLangkah({ modules, progress: {}, attempts: [] })
    expect(r.topikAktif).toEqual({ id: 1, orderNum: 1, title: 'Modul 1' })
    expect(r.langkah).toBe('baca')
    expect(r.topikSelesai).toBe(0)
    expect(r.halaman).toBeUndefined()
    expect(r.skorTerakhir).toBeUndefined()
  })

  it('modul 1 dibaca penuh: langkah formatif, halaman terisi', () => {
    const progress = { [moduleIdToPath(1)]: { pct: 100, currentPage: 20, lastOpened: null } }
    const r = hitungLangkah({ modules, progress, attempts: [] })
    expect(r.topikAktif.id).toBe(1)
    expect(r.langkah).toBe('formatif')
    expect(r.halaman).toEqual({ dibaca: 20, total: 20 })
    expect(r.topikSelesai).toBe(0)
  })

  it('modul 1 remedial 64: topik aktif tetap modul 1, skor terakhir remedial', () => {
    const progress = { [moduleIdToPath(1)]: { pct: 100, currentPage: 20, lastOpened: null } }
    const attempts = [attempt(1, 64, '2026-01-01')]
    const r = hitungLangkah({ modules, progress, attempts })
    expect(r.topikAktif.id).toBe(1)
    expect(r.langkah).toBe('formatif')
    expect(r.topikSelesai).toBe(0)
    expect(r.skorTerakhir).toEqual({ moduleId: 1, score: 64, lulus: false })
  })

  it('semua lulus: langkah selesai-semua, topik aktif modul terakhir', () => {
    const progress = Object.fromEntries(
      modules.map((m) => [moduleIdToPath(m.id), { pct: 100, currentPage: 20, lastOpened: null }]),
    )
    const attempts = modules.map((m) => attempt(m.id, 90, `2026-01-0${m.id}`))
    const r = hitungLangkah({ modules, progress, attempts })
    expect(r.langkah).toBe('selesai-semua')
    expect(r.topikAktif.id).toBe(9)
    expect(r.topikSelesai).toBe(9)
    expect(r.skorTerakhir).toEqual({ moduleId: 9, score: 90, lulus: true })
  })
})
