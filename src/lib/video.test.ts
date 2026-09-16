import { describe, it, expect } from 'vitest'
import { parseVideoUrl, thumbnailUrl } from './video'

describe('parseVideoUrl', () => {
  it('parses youtube.com/watch?v=', () => {
    expect(parseVideoUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
  })

  it('parses youtu.be/', () => {
    expect(parseVideoUrl('https://youtu.be/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
  })

  it('parses youtube.com/embed/', () => {
    expect(parseVideoUrl('https://www.youtube.com/embed/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
  })

  it('parses youtube.com/shorts/', () => {
    expect(parseVideoUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toEqual({
      kind: 'youtube',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    })
  })

  it('parses a direct .mp4 file URL', () => {
    expect(parseVideoUrl('https://example.com/video.mp4')).toEqual({
      kind: 'file',
      src: 'https://example.com/video.mp4',
    })
  })

  it('returns null for an unrecognized URL', () => {
    expect(parseVideoUrl('https://example.com/not-a-video')).toBeNull()
    expect(parseVideoUrl('')).toBeNull()
    expect(parseVideoUrl(null)).toBeNull()
    expect(parseVideoUrl(undefined)).toBeNull()
  })
})

// Antrean #44b (16 Sep 2026): thumbnail untuk kolom Video / modal Ubah tautan.
describe('thumbnailUrl', () => {
  it('returns the YouTube hqdefault thumbnail for a YouTube URL', () => {
    expect(thumbnailUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(
      'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
    )
  })

  it('returns null for a direct video file URL (no ready-made thumbnail)', () => {
    expect(thumbnailUrl('https://example.com/video.mp4')).toBeNull()
  })

  it('returns null for empty/unrecognized input', () => {
    expect(thumbnailUrl('')).toBeNull()
    expect(thumbnailUrl(null)).toBeNull()
    expect(thumbnailUrl(undefined)).toBeNull()
    expect(thumbnailUrl('https://example.com/not-a-video')).toBeNull()
  })
})
