// Theme picker (Pengaturan.tsx) — swaps design tokens at runtime via
// injectDesignTokens(). "Bawaan" is this project's existing warm parchment
// palette. "Seline" and "Claude" reference two other theme palettes shown
// live during development, adapted to this project's token set (colors +
// button fill/text + soft-accent tint, not just the accent hue).

export type ThemeId = 'bawaan' | 'seline' | 'claude' | 'soft-pill' | 'executive'

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
  btnBg: string
  btnText: string
  accentSoft: string
  fontSans: string
  fontDisplay: string
  r: string
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
      btnBg: '#D4A373',
      btnText: '#FFFFFF',
      accentSoft: 'rgba(212,163,115,.12)',
      fontSans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Playfair Display', ui-serif, serif",
      r: '12px',
    },
  },
  seline: {
    label: 'Seline',
    desc: 'Netral terang, aksen biru.',
    colors: {
      cream: '#FAFAF9',
      ivory: '#FFFFFF',
      bg3: '#F4F4F3',
      terra: '#3BA6F1',
      terraD: '#2B87CC',
      // NOT SAKTI's own #0C0A09 -- that value is calibrated for thin text
      // strokes (its --text-primary), not the ~40 places in this app that
      // reuse `brown` as a big hero/CTA/active-nav FILL color too (Vark.tsx,
      // Diagnostik.tsx, etc.) -- filling a whole banner with near-pure-black
      // reads as harsh/"legam" in a way the same value never does as text.
      // Vivid saturated blue, not dark-navy-that-still-reads-as-black --
      // user flagged the navy attempt as still "gelap" twice. This is
      // clearly a BLUE hero, not a dark neutral block, while still dark
      // enough for white text on top.
      brown: '#1D5FA8',
      brown2: '#78716C',
      brown3: '#A39C95',
      brown4: '#C9C3BD',
      border: '#E8E6E5',
      border2: '#F0EFEE',
      btnBg: '#3BA6F1',
      btnText: '#FFFFFF',
      accentSoft: '#EEF7FE',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Inter', ui-sans-serif, system-ui, sans-serif",
      r: '12px',
    },
  },
  claude: {
    label: 'Claude',
    desc: 'Bone parchment, aksen terracotta jarang.',
    colors: {
      cream: '#F8F8F6',
      ivory: '#FFFFFF',
      bg3: '#F3F2EE',
      terra: '#D97757',
      terraD: '#C05F3F',
      // Vivid terracotta-brown, not near-black -- same fix as Seline's blue
      // above: a colorful hero tied to the accent hue, not a dark neutral.
      brown: '#8B4A2E',
      brown2: '#373734',
      brown3: '#7B7974',
      brown4: '#B5AFA8',
      border: '#E7E6E1',
      border2: '#F0EFEA',
      btnBg: '#121212',
      btnText: '#FFFFFF',
      accentSoft: 'rgba(217,119,87,.12)',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Inter Tight', 'Inter', ui-sans-serif, system-ui, sans-serif",
      r: '12px',
    },
  },
  'soft-pill': {
    label: 'Soft Pill',
    desc: 'Radius besar, aksen oranye hangat, kesan ramah.',
    colors: {
      cream: '#F4F4F5',
      ivory: '#FFFFFF',
      bg3: '#FAFAFA',
      terra: '#EA580C',
      terraD: '#C2410C',
      brown: '#1C1917',
      brown2: '#57534E',
      brown3: '#A8A29E',
      brown4: '#D6D3D1',
      border: '#EBEBEC',
      border2: '#F4F3F2',
      btnBg: '#EA580C',
      btnText: '#FFFFFF',
      accentSoft: '#FFF1E6',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Inter', ui-sans-serif, system-ui, sans-serif",
      r: '18px',
    },
  },
  executive: {
    label: 'Executive',
    desc: 'Navy & emas, radius tajam, judul serif -- kesan formal.',
    colors: {
      cream: '#F7F5EE',
      ivory: '#FFFFFF',
      bg3: '#F3F2EA',
      terra: '#B8860B',
      terraD: '#8A6508',
      // Navy (not black) doubles as text + hero/CTA/active-nav fill, same
      // dual-purpose pattern as every other theme's `brown` token.
      brown: '#0F1B33',
      brown2: '#3D4A63',
      brown3: '#8B93A3',
      brown4: '#C7CCD6',
      border: '#E3DDC9',
      border2: '#EFEBDD',
      btnBg: '#0F1B33',
      btnText: '#F3E7C0',
      accentSoft: '#FBF3DC',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      // Serif headings for a formal/executive register -- Georgia is a
      // system font (no webfont load needed), unlike the Google Fonts pairs
      // the other themes use.
      fontDisplay: "Georgia, 'Times New Roman', serif",
      r: '6px',
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
