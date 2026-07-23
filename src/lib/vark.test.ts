// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchVarkResult } from './vark'

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
