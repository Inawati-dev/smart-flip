// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { computeRataRata, fetchFeedback, saveFeedback, type Feedback } from './feedback'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// so every call below exercises the localStorage fallback path — matches the
// existing precedent in forum.test.ts / progress.test.ts.

const FEEDBACK_KEY = 'sfp_feedback'

beforeEach(() => {
  localStorage.clear()
})

describe('computeRataRata', () => {
  it('averages the four aspects to one decimal place, ported verbatim from legacy/data-layer.js', () => {
    expect(computeRataRata({ konten: 5, kemudahan: 5, keterbacaan: 5, kebermanfaatan: 5 })).toBe('5.0')
    expect(computeRataRata({ konten: 4, kemudahan: 3, keterbacaan: 5, kebermanfaatan: 4 })).toBe('4.0')
    expect(computeRataRata({ konten: 5, kemudahan: 4, keterbacaan: 4, kebermanfaatan: 3 })).toBe('4.0')
    expect(computeRataRata({ konten: 3, kemudahan: 4, keterbacaan: 3, kebermanfaatan: 4 })).toBe('3.5')
  })
})

describe('fetchFeedback (localStorage fallback)', () => {
  it('returns an empty array when nothing is seeded', async () => {
    expect(await fetchFeedback()).toEqual([])
  })

  it('reads feedback from the exact legacy localStorage key', async () => {
    const seeded: Feedback[] = [
      {
        id: 'fb_1', moduleId: 1, konten: 5, kemudahan: 4, keterbacaan: 4, kebermanfaatan: 5,
        rataRata: '4.5', komentar: 'Bagus', date: new Date().toISOString(),
      },
    ]
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(seeded))
    expect(await fetchFeedback()).toEqual(seeded)
  })

  it('filters by moduleId when provided', async () => {
    const seeded: Feedback[] = [
      { id: 'f1', moduleId: 1, konten: 5, kemudahan: 5, keterbacaan: 5, kebermanfaatan: 5, rataRata: '5.0', komentar: '', date: '' },
      { id: 'f2', moduleId: 2, konten: 3, kemudahan: 3, keterbacaan: 3, kebermanfaatan: 3, rataRata: '3.0', komentar: '', date: '' },
    ]
    localStorage.setItem(FEEDBACK_KEY, JSON.stringify(seeded))
    const filtered = await fetchFeedback(2)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('f2')
  })
})

describe('saveFeedback (localStorage fallback)', () => {
  it('appends a new entry under the legacy key with a computed rataRata', async () => {
    await saveFeedback(3, { konten: 5, kemudahan: 4, keterbacaan: 4, kebermanfaatan: 3, komentar: '  Mantap  ' })

    const raw = JSON.parse(localStorage.getItem(FEEDBACK_KEY)!) as Feedback[]
    expect(raw).toHaveLength(1)
    expect(raw[0].moduleId).toBe(3)
    expect(raw[0].rataRata).toBe('4.0')
    expect(raw[0].komentar).toBe('  Mantap  ')
    expect(raw[0].id).toMatch(/^fb_/)
  })

  it('defaults komentar to an empty string when omitted', async () => {
    await saveFeedback(1, { konten: 5, kemudahan: 5, keterbacaan: 5, kebermanfaatan: 5 })
    const raw = JSON.parse(localStorage.getItem(FEEDBACK_KEY)!) as Feedback[]
    expect(raw[0].komentar).toBe('')
  })

  it('accumulates multiple submissions', async () => {
    await saveFeedback(1, { konten: 5, kemudahan: 5, keterbacaan: 5, kebermanfaatan: 5 })
    await saveFeedback(2, { konten: 3, kemudahan: 3, keterbacaan: 3, kebermanfaatan: 3 })
    expect(await fetchFeedback()).toHaveLength(2)
  })
})

describe('graceful localStorage failure handling', () => {
  it('fetchFeedback returns [] when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await fetchFeedback()).toEqual([])
    spy.mockRestore()
  })

  it('saveFeedback does not throw when localStorage.setItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('boom')
    })
    await expect(
      saveFeedback(1, { konten: 5, kemudahan: 5, keterbacaan: 5, kebermanfaatan: 5 }),
    ).resolves.toBeUndefined()
    spy.mockRestore()
  })
})
