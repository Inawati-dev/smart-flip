// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { formatAttemptDate, fetchAllQuizAttempts } from './quizAttempts'

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
