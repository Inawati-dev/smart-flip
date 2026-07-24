// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatAttemptDate, fetchAllQuizAttempts, fetchQuizAttempts, saveQuizAttempt } from './quizAttempts'

vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

describe('formatAttemptDate', () => {
  it('formats an ISO date string into id-ID short date format', () => {
    // 2026-03-05 -> "05 Mar 2026" (id-ID locale, 2-digit day, short month, numeric year)
    const result = formatAttemptDate('2026-03-05T10:00:00.000Z')
    expect(result).toMatch(/^\d{2} \w{3} 2026$/)
  })
})

describe('fetchAllQuizAttempts', () => {
  beforeEach(() => localStorage.clear())

  it('flattens attempts across all modules, tagging each with its moduleId', async () => {
    localStorage.setItem(
      'sfp_quiz_2',
      JSON.stringify([{ score: 80, answers: [], completedAt: '2026-01-01', date: '01 Jan 2026' }]),
    )
    localStorage.setItem(
      'sfp_quiz_5',
      JSON.stringify([{ score: 90, answers: [], completedAt: '2026-01-02', date: '02 Jan 2026' }]),
    )
    const rows = await fetchAllQuizAttempts(9)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.moduleId === 2)?.score).toBe(80)
    expect(rows.find((r) => r.moduleId === 5)?.score).toBe(90)
  })

  it('returns an empty array when no module has any attempts', async () => {
    expect(await fetchAllQuizAttempts(9)).toEqual([])
  })
})

describe('saveQuizAttempt', () => {
  beforeEach(() => localStorage.clear())

  it('writes to the canonical sfp_quiz_<id> key (not sfp_kuis_<id>), so fetchQuizAttempts reads it straight back', async () => {
    await saveQuizAttempt(3, { score: 80, answers: [0, 1, 2] })
    expect(localStorage.getItem('sfp_kuis_3')).toBeNull()
    const attempts = await fetchQuizAttempts(3)
    expect(attempts).toHaveLength(1)
    expect(attempts[0].score).toBe(80)
    expect(attempts[0].answers).toEqual([0, 1, 2])
  })

  it('appends to existing attempts rather than overwriting them', async () => {
    await saveQuizAttempt(4, { score: 60, answers: [] })
    await saveQuizAttempt(4, { score: 90, answers: [] })
    const attempts = await fetchQuizAttempts(4)
    expect(attempts).toHaveLength(2)
    expect(attempts.map((a) => a.score)).toEqual([60, 90])
  })

  it('caps stored attempts at the last 10, matching legacy behavior', async () => {
    for (let i = 0; i < 12; i++) {
      await saveQuizAttempt(6, { score: i, answers: [] })
    }
    const attempts = await fetchQuizAttempts(6)
    expect(attempts).toHaveLength(10)
    expect(attempts.map((a) => a.score)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
  })
})
