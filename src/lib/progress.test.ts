// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  moduleIdToPath,
  fetchTimeSpent,
  fetchTotalTimeSpent,
  fetchAllProgress,
  saveProgress,
  TOTAL_MODULES,
} from './progress'

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

describe('saveProgress (localStorage fallback)', () => {
  beforeEach(() => localStorage.clear())

  it('writes to the exact sfp_<modulePath> key fetchAllProgress reads back', async () => {
    await saveProgress('books/modul-03.pdf', {
      pct: 45,
      currentPage: 4,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })
    const raw = localStorage.getItem('sfp_books/modul-03.pdf')
    expect(raw).toBeTruthy()
    expect(JSON.parse(raw!)).toEqual({
      pct: 45,
      currentPage: 4,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })

    const all = await fetchAllProgress()
    expect(all['books/modul-03.pdf']).toEqual({
      pct: 45,
      currentPage: 4,
      lastOpened: '2026-07-23T00:00:00.000Z',
    })
  })

  it('defaults lastOpened to now when not provided', async () => {
    await saveProgress('books/modul-05.pdf', { pct: 10, currentPage: 1 })
    const raw = JSON.parse(localStorage.getItem('sfp_books/modul-05.pdf')!)
    expect(typeof raw.lastOpened).toBe('string')
    expect(raw.lastOpened.length).toBeGreaterThan(0)
  })

  it('merges into existing progress rather than dropping unrelated fields', async () => {
    await saveProgress('books/modul-02.pdf', { pct: 10, currentPage: 1, lastOpened: 'a' })
    await saveProgress('books/modul-02.pdf', { pct: 60, currentPage: 6, lastOpened: 'b' })
    const raw = JSON.parse(localStorage.getItem('sfp_books/modul-02.pdf')!)
    expect(raw).toEqual({ pct: 60, currentPage: 6, lastOpened: 'b' })
  })
})
