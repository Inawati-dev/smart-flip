// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  formatDraftDate,
  fetchDrafts,
  submitDraft,
  addDraftComment,
  updateDraftStatus,
  type Draft,
} from './draf'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// so every call below exercises the localStorage fallback path — matches the
// existing precedent in forum.test.ts / progress.test.ts.

const DRAFT_KEY = 'sfp_drafts'

beforeEach(() => {
  localStorage.clear()
})

describe('formatDraftDate', () => {
  it('returns "baru saja" for very recent timestamps', () => {
    expect(formatDraftDate(new Date().toISOString())).toBe('baru saja')
  })

  it('formats minutes, hours, and days ago', () => {
    expect(formatDraftDate(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 menit lalu')
    expect(formatDraftDate(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3 jam lalu')
    expect(formatDraftDate(new Date(Date.now() - 2 * 86400000).toISOString())).toBe('2 hari lalu')
  })

  it('falls back to a locale date string beyond 7 days', () => {
    const result = formatDraftDate(new Date(Date.now() - 10 * 86400000).toISOString())
    expect(result).not.toMatch(/lalu$/)
  })

  it('returns an empty string for missing input', () => {
    expect(formatDraftDate(null)).toBe('')
    expect(formatDraftDate(undefined)).toBe('')
  })

  it('never throws for invalid input', () => {
    expect(() => formatDraftDate('not-a-date')).not.toThrow()
  })
})

describe('fetchDrafts (localStorage fallback)', () => {
  it('returns an empty array when nothing is seeded', async () => {
    expect(await fetchDrafts(false)).toEqual([])
  })

  it('reads drafts from the exact legacy localStorage key', async () => {
    const seeded: Draft[] = [
      {
        id: 'draft_1', moduleId: 1, moduleName: 'Modul 1', authorName: 'Budi',
        title: 'Judul', version: 1, content: 'Isi draf', status: 'submitted',
        submittedAt: new Date().toISOString(), comments: [],
      },
    ]
    localStorage.setItem(DRAFT_KEY, JSON.stringify(seeded))
    expect(await fetchDrafts(false)).toEqual(seeded)
  })

  it('filters by moduleId when provided', async () => {
    const seeded: Draft[] = [
      { id: 'd1', moduleId: 1, moduleName: 'M1', authorName: 'A', title: 't', version: 1, content: 'x', status: 'submitted', submittedAt: '', comments: [] },
      { id: 'd2', moduleId: 2, moduleName: 'M2', authorName: 'B', title: 't', version: 1, content: 'y', status: 'submitted', submittedAt: '', comments: [] },
    ]
    localStorage.setItem(DRAFT_KEY, JSON.stringify(seeded))
    const filtered = await fetchDrafts(true, 2)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('d2')
  })
})

describe('submitDraft (localStorage fallback)', () => {
  it('prepends a new draft under the legacy key and returns it', async () => {
    const draft = await submitDraft({
      moduleId: 3, moduleName: 'Modul 3', authorName: 'Dedi', title: 'Judul Draf', content: 'Isi konten draf',
    })
    expect(draft.title).toBe('Judul Draf')
    expect(draft.moduleId).toBe(3)
    expect(draft.status).toBe('submitted')
    expect(draft.version).toBe(1)
    expect(draft.comments).toEqual([])

    const raw = JSON.parse(localStorage.getItem(DRAFT_KEY)!) as Draft[]
    expect(raw).toHaveLength(1)
    expect(raw[0].id).toBe(draft.id)
  })

  it('defaults authorName when not provided', async () => {
    const draft = await submitDraft({ moduleId: 1, moduleName: 'Modul 1', title: 'T', content: 'C' })
    expect(draft.authorName).toBe('Mahasiswa')
  })
})

describe('addDraftComment (localStorage fallback)', () => {
  it('appends a comment to the matching draft', async () => {
    const draft = await submitDraft({ moduleId: 1, moduleName: 'Modul 1', title: 'T', content: 'C' })

    await addDraftComment(draft.id, { text: 'Perbaiki bagian ini', authorName: 'Dr. Ahmad', authorRole: 'dosen' })

    const [updated] = await fetchDrafts(false)
    expect(updated.comments).toHaveLength(1)
    expect(updated.comments[0].text).toBe('Perbaiki bagian ini')
    expect(updated.comments[0].authorRole).toBe('dosen')
  })

  it('returns null when the draft does not exist', async () => {
    const result = await addDraftComment('missing_id', { text: 'test', authorRole: 'mahasiswa' })
    expect(result).toBeNull()
  })
})

describe('updateDraftStatus (localStorage fallback)', () => {
  it('updates the status of the matching draft', async () => {
    const draft = await submitDraft({ moduleId: 1, moduleName: 'Modul 1', title: 'T', content: 'C' })
    await updateDraftStatus(draft.id, 'reviewed')

    const [updated] = await fetchDrafts(false)
    expect(updated.status).toBe('reviewed')
  })

  it('is a no-op when the draft does not exist', async () => {
    await expect(updateDraftStatus('missing_id', 'revision')).resolves.toBeUndefined()
  })
})

describe('graceful localStorage failure handling', () => {
  it('fetchDrafts returns [] when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await fetchDrafts(false)).toEqual([])
    spy.mockRestore()
  })
})
