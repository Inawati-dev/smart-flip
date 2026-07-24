// Theme picker (Pengaturan.tsx) — swaps the warm-palette color tokens at
// runtime via injectDesignTokens(). Two references pulled live from SAKTI's
// own theme picker (sakti-ku.vercel.app, Settings -> Tema) at the user's
// request: "Seline" (SAKTI's "Mode Terang", cool neutral + blue accent) and
// "Claude" (SAKTI's own claude.ai-signature terracotta theme). "Bawaan" is
// this project's existing warm parchment palette, unchanged.
//
// Only the color tokens are swappable — shadows/radii stay constant across
// themes (not part of any of the 3 reference palettes, no reason to vary).

export type ThemeId = 'bawaan' | 'seline' | 'claude'

export interface ThemeColors {
  cream: string
  ivory: string
  bg3: string
  terra: string
  terraD: string
  brown: string
  brown2: string
  brown3: string
  brown4: string
  border: string
  border2: string
}

export const THEMES: Record<ThemeId, { label: string; desc: string; colors: ThemeColors }> = {
  bawaan: {
    label: 'Bawaan',
    desc: 'Parchment hangat, aksen terracotta — tema asli Smart Flip.',
    colors: {
      cream: '#F5F2E9',
      ivory: '#FFFDF8',
      bg3: '#FAF7F0',
      terra: '#D4A373',
      terraD: '#B8855A',
      brown: '#3E362E',
      brown2: '#6B5D4F',
      brown3: '#9B8B7A',
      brown4: '#C5B8AD',
      border: 'rgba(62,54,46,.10)',
      border2: 'rgba(62,54,46,.06)',
    },
  },
  seline: {
    label: 'Seline',
    desc: 'Netral terang, aksen biru — signature asli "Mode Terang" SAKTI.',
    colors: {
      cream: '#FAFAF9',
      ivory: '#FFFFFF',
      bg3: '#F4F4F3',
      terra: '#3BA6F1',
      terraD: '#2B87CC',
      brown: '#0C0A09',
      brown2: '#78716C',
      brown3: '#A39C95',
      brown4: '#C9C3BD',
      border: '#E8E6E5',
      border2: '#F0EFEE',
    },
  },
  claude: {
    label: 'Claude',
    desc: 'Bone parchment, aksen terracotta jarang — signature asli claude.ai.',
    colors: {
      cream: '#F8F8F6',
      ivory: '#FFFFFF',
      bg3: '#F3F2EE',
      terra: '#D97757',
      terraD: '#C05F3F',
      brown: '#121212',
      brown2: '#373734',
      brown3: '#7B7974',
      brown4: '#B5AFA8',
      border: '#E7E6E1',
      border2: '#F0EFEA',
    },
  },
}

const KEY = 'sfp_theme'

export function getTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY)
    if (v && v in THEMES) return v as ThemeId
  } catch {
    // ignore — falls through to default
  }
  return 'bawaan'
}

export function setTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // ignore — worst case the choice doesn't persist across visits
  }
}
