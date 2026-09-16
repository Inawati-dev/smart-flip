// Parses a dosen-entered video URL into a renderable form for Video.tsx.
// Spec: docs/superpowers/specs/2026-09-15-tiga-menu-asesmen-design.md §9 WP4.

export type ParsedVideo = { kind: 'youtube'; embedUrl: string } | { kind: 'file'; src: string }

const YOUTUBE_ID_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([\w-]{11})/,
  /youtu\.be\/([\w-]{11})/,
  /youtube\.com\/embed\/([\w-]{11})/,
  /youtube\.com\/shorts\/([\w-]{11})/,
]

export function parseVideoUrl(url: string | null | undefined): ParsedVideo | null {
  const trimmed = url?.trim()
  if (!trimmed) return null

  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return { kind: 'youtube', embedUrl: `https://www.youtube-nocookie.com/embed/${match[1]}` }
  }

  if (/\.(mp4|webm)(\?.*)?$/i.test(trimmed)) return { kind: 'file', src: trimmed }

  return null
}

// Gambar sampul untuk tampilan tabel/modal (antrean #44b). YouTube punya
// thumbnail publik siap pakai; berkas video tidak (butuh <video> yang
// memuat frame pertama sendiri), jadi null di situ — pemanggil merender
// <video preload="metadata"> sebagai gantinya.
export function thumbnailUrl(url: string | null | undefined): string | null {
  const trimmed = url?.trim()
  if (!trimmed) return null

  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match) return `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`
  }

  return null
}
