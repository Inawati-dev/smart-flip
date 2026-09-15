// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { fetchBankSoal } from './kuisSoal'

// Fake Supabase query builder that fails with a Postgres 42703 (undefined
// column) error whenever the select() list mentions `kind` — mirroring a
// deploy that shipped before migration_v17_bank_soal.sql added that column
// — and otherwise resolves with mockRows. select() args are inspected
// directly rather than modeling a full postgrest chain, since kuisSoal.ts's
// two code paths (with/without `kind`) use two distinct literal select()
// strings.
let mockRows: unknown[] = []

function makeQuery(selectCols: string) {
  const query = {
    eq: () => query,
    order: async () => {
      if (selectCols.includes('kind')) {
        return { data: null, error: { code: '42703', message: 'column quiz_questions.kind does not exist' } }
      }
      return { data: mockRows, error: null }
    },
  }
  return query
}

vi.mock('./supabase', () => ({
  supabase: {
    from: () => ({
      select: (cols: string) => makeQuery(cols),
    }),
  },
  isSupabaseConfigured: true,
}))

describe('fetchBankSoal — toleransi jeda deploy-vs-migrasi (kolom kind belum ada, 42703)', () => {
  beforeEach(() => {
    mockRows = []
    localStorage.clear()
  })

  it("falls back to the kind-less query and tags results kind:'formatif'", async () => {
    mockRows = [
      { id: 1, module_id: 2, question: 'Apa itu R&D?', options: ['a', 'b', 'c', 'd'], answer_idx: 0, explanation: null, order_num: 1 },
    ]
    const result = await fetchBankSoal('formatif', 2)
    expect(result).toHaveLength(1)
    expect(result[0].kind).toBe('formatif')
    expect(result[0].module_id).toBe(2)
  })

  it("returns [] for a non-formatif kind ('vark') instead of falling back", async () => {
    const result = await fetchBankSoal('vark')
    expect(result).toEqual([])
  })
})
