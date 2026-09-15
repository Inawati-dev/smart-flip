// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  formatAttemptDate,
  fetchAllQuizAttempts,
  fetchAllQuizAttemptsOnce,
  fetchQuizAttempts,
  saveQuizAttempt,
  PASS_SCORE,
} from './quizAttempts'

// Mutable mock state so individual tests can flip Supabase "configured" on
// to inspect what saveQuizAttempt sends to `.insert()`, and to control what
// a `.select()` chain resolves to for fetchAllQuizAttemptsOnce, while the
// existing tests below keep running against the plain localStorage fallback
// (the default, configured = false).
const supabaseMock = {
  configured: false,
  insertCalls: [] as Array<Record<string, unknown>>,
  selectResult: { data: [] as unknown[], error: null as unknown },
  fromCalls: 0,
}

// Thenable query builder: every filter method returns itself so calls like
// .select().eq().not().order() chain freely, and `await`ing it at any point
// resolves to selectResult — same shape as the real supabase-js builder.
function makeQueryBuilder() {
  const builder = {
    select: () => builder,
    eq: () => builder,
    not: () => builder,
    order: () => builder,
    then: (resolve: (v: unknown) => void) => resolve(supabaseMock.selectResult),
  }
  return builder
}

vi.mock('./supabase', () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: supabaseMock.configured ? { id: 'user-1' } : null } }),
    },
    from: () => {
      supabaseMock.fromCalls++
      return {
        insert: (row: Record<string, unknown>) => {
          supabaseMock.insertCalls.push(row)
          return Promise.resolve({ error: null })
        },
        ...makeQueryBuilder(),
      }
    },
  },
  get isSupabaseConfigured() {
    return supabaseMock.configured
  },
}))

describe('PASS_SCORE', () => {
  it('is 80, matching the quiz_attempts.passed generated column (migration_v17)', () => {
    expect(PASS_SCORE).toBe(80)
  })
})

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

describe('saveQuizAttempt — kind (v17)', () => {
  beforeEach(() => {
    supabaseMock.configured = true
    supabaseMock.insertCalls = []
  })

  it('does not send `kind` for a formatif attempt (DB defaults to formatif)', async () => {
    await saveQuizAttempt(3, { score: 80, answers: [0, 1] })
    expect(supabaseMock.insertCalls).toHaveLength(1)
    expect(supabaseMock.insertCalls[0]).not.toHaveProperty('kind')
  })

  it("sends kind:'pre' for a pre-test attempt", async () => {
    await saveQuizAttempt(null, { score: 70, answers: [0, 1], kind: 'pre' })
    expect(supabaseMock.insertCalls).toHaveLength(1)
    expect(supabaseMock.insertCalls[0].kind).toBe('pre')
    expect(supabaseMock.insertCalls[0].module_id).toBeNull()
  })
})

describe('fetchAllQuizAttemptsOnce', () => {
  beforeEach(() => {
    supabaseMock.configured = true
    supabaseMock.fromCalls = 0
    supabaseMock.selectResult = {
      data: [
        { module_id: 2, score: 80, answers: [], attempted_at: '2026-01-01T00:00:00.000Z', kind: 'formatif' },
        { module_id: 5, score: 90, answers: [], attempted_at: '2026-01-02T00:00:00.000Z', kind: 'formatif' },
      ],
      error: null,
    }
  })

  it('hits Supabase exactly once (one query, not one per module)', async () => {
    const rows = await fetchAllQuizAttemptsOnce()
    expect(supabaseMock.fromCalls).toBe(1)
    expect(rows).toHaveLength(2)
    expect(rows.find((r) => r.moduleId === 2)?.score).toBe(80)
    expect(rows.find((r) => r.moduleId === 5)?.score).toBe(90)
  })
})
