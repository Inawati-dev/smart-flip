// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { moduleIdToPath, fetchTimeSpent, fetchTotalTimeSpent, TOTAL_MODULES } from './progress'

vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
  isSupabaseConfigured: false,
}))

describe('moduleIdToPath', () => {
  it('formats the module id into the legacy books/ path convention', () => {
    expect(moduleIdToPath(1)).toBe('books/modul-01.pdf')
    expect(moduleIdToPath(9)).toBe('books/modul-09.pdf')
  })
})

describe('fetchTimeSpent', () => {
  beforeEach(() => localStorage.clear())

  it('reads the legacy sfp_time_<id> localStorage key when Supabase is not configured', async () => {
    localStorage.setItem('sfp_time_3', '720')
    expect(await fetchTimeSpent(3)).toBe(720)
  })

  it('defaults to 0 when nothing is stored', async () => {
    expect(await fetchTimeSpent(7)).toBe(0)
  })
})

describe('fetchTotalTimeSpent', () => {
  beforeEach(() => localStorage.clear())

  it('sums time spent across all TOTAL_MODULES modules', async () => {
    localStorage.setItem('sfp_time_1', '100')
    localStorage.setItem('sfp_time_2', '50')
    expect(TOTAL_MODULES).toBe(9)
    expect(await fetchTotalTimeSpent()).toBe(150)
  })
})
