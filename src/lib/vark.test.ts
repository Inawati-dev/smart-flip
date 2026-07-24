// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchVarkResult, computeVarkDominant, saveVarkResult, clearVarkResult } from './vark'

vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

describe('fetchVarkResult', () => {
  beforeEach(() => localStorage.clear())

  it('returns null when nothing is stored (no VARK assessment taken yet)', async () => {
    expect(await fetchVarkResult()).toBeNull()
  })

  it('reads the legacy sfp_vark localStorage key when Supabase is not configured', async () => {
    localStorage.setItem(
      'sfp_vark',
      JSON.stringify({ V: 10, A: 4, R: 6, K: 2, dominant: 'V', completedAt: '2026-01-01T00:00:00.000Z' }),
    )
    const result = await fetchVarkResult()
    expect(result).toEqual({ V: 10, A: 4, R: 6, K: 2, dominant: 'V', completedAt: '2026-01-01T00:00:00.000Z' })
  })
})

describe('computeVarkDominant', () => {
  it('tallies each answer index to its VARK dimension (0=V, 1=A, 2=R, 3=K)', () => {
    // 12 answers, all option A (index 0) → all Visual
    const { scores, dominant } = computeVarkDominant(new Array(12).fill(0))
    expect(scores).toEqual({ V: 12, A: 0, R: 0, K: 0 })
    expect(dominant).toBe('V')
  })

  it('picks the highest-scoring dimension as dominant (Kinesthetic example)', () => {
    // 8 answers of index 3 (K), 4 of index 1 (A)
    const answers = [3, 3, 3, 3, 3, 3, 3, 3, 1, 1, 1, 1]
    const { scores, dominant } = computeVarkDominant(answers)
    expect(scores).toEqual({ V: 0, A: 4, R: 0, K: 8 })
    expect(dominant).toBe('K')
  })

  it('breaks ties by V,A,R,K order (first strictly-highest wins)', () => {
    // 3 each of V,A,R,K — all tied at 3, so V (checked first) wins
    const answers = [0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3]
    const { scores, dominant } = computeVarkDominant(answers)
    expect(scores).toEqual({ V: 3, A: 3, R: 3, K: 3 })
    expect(dominant).toBe('V')
  })

  it('a Read/Write-tilted tie still resolves to the earlier-checked dimension when scores match', () => {
    // R and K tied at the top (4 each), V/A lower — R comes before K in VARK_KEYS
    const answers = [2, 2, 2, 2, 3, 3, 3, 3, 0, 0, 1, 1]
    const { scores, dominant } = computeVarkDominant(answers)
    expect(scores).toEqual({ V: 2, A: 2, R: 4, K: 4 })
    expect(dominant).toBe('R')
  })

  it('ignores unanswered (null) questions and treats an all-null array as V by default', () => {
    const { scores, dominant } = computeVarkDominant(new Array(12).fill(null))
    expect(scores).toEqual({ V: 0, A: 0, R: 0, K: 0 })
    expect(dominant).toBe('V')
  })
})

describe('saveVarkResult / clearVarkResult (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips through sfp_vark so fetchVarkResult reads back what was saved', async () => {
    await saveVarkResult({ V: 9, A: 1, R: 1, K: 1, dominant: 'V', completedAt: '2026-07-23T00:00:00.000Z' })
    const result = await fetchVarkResult()
    expect(result).toEqual({ V: 9, A: 1, R: 1, K: 1, dominant: 'V', completedAt: '2026-07-23T00:00:00.000Z' })
  })

  it('fills in completedAt when not provided', async () => {
    await saveVarkResult({ V: 1, A: 2, R: 3, K: 6, dominant: 'K', completedAt: '' })
    const result = await fetchVarkResult()
    expect(result?.completedAt).toBeTruthy()
    expect(typeof result?.completedAt).toBe('string')
  })

  it('clearVarkResult removes the stored result so fetchVarkResult returns null again', async () => {
    await saveVarkResult({ V: 5, A: 2, R: 3, K: 2, dominant: 'V', completedAt: '2026-07-23T00:00:00.000Z' })
    expect(await fetchVarkResult()).not.toBeNull()
    await clearVarkResult()
    expect(await fetchVarkResult()).toBeNull()
  })
})
