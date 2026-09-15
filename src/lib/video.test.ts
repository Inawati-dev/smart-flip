import { describe, it, expect } from 'vitest'
import { parseVideoUrl } from './video'

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
