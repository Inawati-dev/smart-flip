// Ebook reader page-turn style preference — pure localStorage, per-browser
// only (a display preference, not user/account data worth syncing through
// Supabase). Experimental per explicit user request: if the chosen style
// doesn't work out, this whole file plus the picker UI in Ebook.tsx is the
// entire surface area to remove.

export type ReaderStyle = 'flip3d' | 'spread' | 'slide'

const KEY = 'sfp_reader_style'
const VALID: ReaderStyle[] = ['flip3d', 'spread', 'slide']

export function getReaderStyle(): ReaderStyle {
  try {
    const v = localStorage.getItem(KEY)
    if (v && (VALID as string[]).includes(v)) return v as ReaderStyle
  } catch {
    // ignore — falls through to default
  }
  return 'flip3d'
}

export function setReaderStyle(style: ReaderStyle): void {
  try {
    localStorage.setItem(KEY, style)
  } catch {
    // ignore — worst case the choice doesn't persist across visits
  }
}
