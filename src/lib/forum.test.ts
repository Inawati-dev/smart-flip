// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { timeAgo, initials, avatarColor, fetchPosts, addPost, addReply, likePost, type ForumPost } from './forum'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// so every call below exercises the localStorage fallback path — matches the
// existing precedent in progress.test.ts / quizAttempts.test.ts.

const FORUM_KEY = 'sfp_forum'

beforeEach(() => {
  localStorage.clear()
})

describe('timeAgo', () => {
  it('returns "baru saja" for very recent timestamps', () => {
    expect(timeAgo(new Date().toISOString())).toBe('baru saja')
  })

  it('formats minutes and hours ago', () => {
    expect(timeAgo(new Date(Date.now() - 5 * 60000).toISOString())).toBe('5 menit lalu')
    expect(timeAgo(new Date(Date.now() - 3 * 3600000).toISOString())).toBe('3 jam lalu')
  })

  it('falls back to a date string beyond 24 hours', () => {
    const result = timeAgo(new Date(Date.now() - 3 * 86400000).toISOString())
    expect(result).toMatch(/^\d{1,2} \w{3} \d{4}$/)
  })

  it('never throws for invalid input (ported verbatim from legacy/forum.html, including its NaN-string quirk)', () => {
    expect(() => timeAgo('not-a-date')).not.toThrow()
  })
})

describe('initials', () => {
  it('takes the first letter of up to two words, uppercased', () => {
    expect(initials('Budi Santoso')).toBe('BS')
    expect(initials('Rina')).toBe('R')
  })

  it('falls back to "?" for empty or missing names', () => {
    expect(initials(undefined)).toBe('?')
    expect(initials('')).toBe('?')
  })
})

describe('avatarColor', () => {
  it('is deterministic for the same name', () => {
    expect(avatarColor('Budi Santoso')).toBe(avatarColor('Budi Santoso'))
  })

  it('returns a hex color string', () => {
    expect(avatarColor('Siti Rahma')).toMatch(/^#[0-9A-Fa-f]{6}$/)
  })
})

describe('fetchPosts (localStorage fallback)', () => {
  it('returns an empty array when nothing is seeded', async () => {
    expect(await fetchPosts()).toEqual([])
  })

  it('reads posts from the exact legacy localStorage key', async () => {
    const seeded: ForumPost[] = [
      {
        id: 'post_1', moduleId: 1, authorName: 'Budi', authorRole: 'mahasiswa',
        content: 'Halo', createdAt: new Date().toISOString(), likes: 0, replies: [],
      },
    ]
    localStorage.setItem(FORUM_KEY, JSON.stringify(seeded))
    expect(await fetchPosts()).toEqual(seeded)
  })

  it('filters by moduleId when provided', async () => {
    const seeded: ForumPost[] = [
      { id: 'p1', moduleId: 1, authorName: 'A', authorRole: 'mahasiswa', content: 'x', createdAt: '', likes: 0, replies: [] },
      { id: 'p2', moduleId: 2, authorName: 'B', authorRole: 'mahasiswa', content: 'y', createdAt: '', likes: 0, replies: [] },
    ]
    localStorage.setItem(FORUM_KEY, JSON.stringify(seeded))
    const filtered = await fetchPosts(2)
    expect(filtered).toHaveLength(1)
    expect(filtered[0].id).toBe('p2')
  })
})

describe('addPost (localStorage fallback)', () => {
  it('prepends a new post under the legacy key and returns it', async () => {
    const post = await addPost({ moduleId: 3, content: '  Pertanyaan tentang modul ini  ', authorName: 'Dedi', authorRole: 'mahasiswa' })
    expect(post.content).toBe('Pertanyaan tentang modul ini')
    expect(post.moduleId).toBe(3)
    expect(post.likes).toBe(0)
    expect(post.replies).toEqual([])

    const raw = JSON.parse(localStorage.getItem(FORUM_KEY)!) as ForumPost[]
    expect(raw).toHaveLength(1)
    expect(raw[0].id).toBe(post.id)
  })

  it('defaults authorName/authorRole when not provided', async () => {
    const post = await addPost({ moduleId: 1, content: 'Tanpa nama eksplisit' })
    expect(post.authorName).toBe('Mahasiswa')
    expect(post.authorRole).toBe('mahasiswa')
  })
})

describe('addReply (localStorage fallback)', () => {
  it('appends a reply to the matching post', async () => {
    await addPost({ moduleId: 1, content: 'Post induk untuk balasan' })
    const [post] = await fetchPosts()

    await addReply(post.id, 'Ini balasannya', 'Dr. Ahmad', 'dosen')

    const [updated] = await fetchPosts()
    expect(updated.replies).toHaveLength(1)
    expect(updated.replies[0].content).toBe('Ini balasannya')
    expect(updated.replies[0].authorRole).toBe('dosen')
  })

  it('is a no-op when the post does not exist', async () => {
    await expect(addReply('missing_id', 'test')).resolves.toBeUndefined()
  })
})

describe('likePost (localStorage fallback)', () => {
  it('increments the likes counter', async () => {
    const post = await addPost({ moduleId: 1, content: 'Post untuk disukai' })
    await likePost(post.id)
    await likePost(post.id)

    const [updated] = await fetchPosts()
    expect(updated.likes).toBe(2)
  })
})

describe('graceful localStorage failure handling', () => {
  it('fetchPosts returns [] when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await fetchPosts()).toEqual([])
    spy.mockRestore()
  })
})
