import { useState } from 'react'
import { applyTheme, getTheme, type ThemeId } from '../lib/theme'

// Tombol toggle tema di rel Layout.tsx (koreksi Johan 16 Sep 2026 — "Tema
// jadi toggle di sidebar saja", menggantikan kartu Tema di Pengaturan.tsx).
// Cuma dua tema (light/dark, lihat lib/theme.ts) jadi toggle sederhana sudah
// cukup — tidak perlu picker.
export function useTheme(): { theme: ThemeId; toggle: () => void } {
  const [theme, setThemeState] = useState<ThemeId>(() => getTheme())

  function toggle() {
    const next: ThemeId = theme === 'light' ? 'dark' : 'light'
    applyTheme(next)
    setThemeState(next)
  }

  return { theme, toggle }
}
