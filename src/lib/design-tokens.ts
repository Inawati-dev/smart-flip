export const designTokens = {
  cream: '#F5F2E9',
  ivory: '#FFFDF8',
  bg3: '#FAF7F0',
  sage: '#8FA287',
  sageD: '#6B7E64',
  sageLight: '#B8CCB2',
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
  // Token status semantik (antrean #42) — nilai bawaan (tema Light) di sini
  // ditimpa oleh injectDesignTokens(THEMES[id].colors) saat boot/ganti tema;
  // lihat src/lib/theme.ts untuk pasangan Dark-nya.
  success: '#27500A',
  successSoft: '#C0DD97',
  danger: '#C04020',
  dangerSoft: 'rgba(192,64,32,.12)',
  warning: '#7D4E00',
  warningSoft: '#FAD7A0',
  info: '#2E5A78',
  infoSoft: 'rgba(74,126,160,.15)',
  overlay: 'rgba(62,54,46,.52)',
  shadowColor: '#3E362E',
  // Ubin ikon rel navigasi (antrean #50): di Dark, ivory/cream sama gelapnya
  // dengan latar rel sehingga ikon hilang; token ini disetel per tema.
  navTileBg: '#FFFDF8',
  navTileBg2: '#F5F2E9',
  navTileFg: '#6B5D4F',
  navTileActiveBg: 'rgba(212,163,115,.16)',
  navTileActiveFg: '#B8855A',
  navTileActiveRing: 'rgba(212,163,115,.55)',
  shadowXs: '0 1px 4px rgba(62,54,46,.07)',
  shadowSm: '0 2px 10px rgba(62,54,46,.09)',
  shadowMd: '0 8px 28px rgba(62,54,46,.13)',
  shadowLg: '0 20px 56px rgba(62,54,46,.18)',
  r: '12px',
  rSm: '8px',
  rPill: '100px',
  red: '#C04020',
  redBorder: 'rgba(192,64,32,.3)',
  fontSans: "'DM Sans', ui-sans-serif, system-ui, sans-serif",
  fontDisplay: "'Playfair Display', ui-serif, serif",
} as const

// Tailwind v4's @theme block (src/index.css) exposes each color a second
// time under a `--color-*` name (that's what utilities like `bg-cream` /
// `text-brown` actually resolve through) — plain inline styles elsewhere in
// the app use the un-prefixed name (`var(--brown)`) directly. Two names,
// same values; both need to move together for a runtime theme switch
// (src/lib/theme.ts) to repaint the whole app, not just the half of it
// written as inline styles.
const CSS_VAR_NAME: Record<keyof typeof designTokens, string> = {
  cream: '--cream',
  ivory: '--ivory',
  bg3: '--bg3',
  sage: '--sage',
  sageD: '--sage-d',
  sageLight: '--sage-light',
  terra: '--terra',
  terraD: '--terra-d',
  brown: '--brown',
  brown2: '--brown2',
  brown3: '--brown3',
  brown4: '--brown4',
  border: '--border',
  border2: '--border2',
  btnBg: '--btn-bg',
  btnText: '--btn-text',
  accentSoft: '--accent-soft',
  success: '--success',
  successSoft: '--success-soft',
  danger: '--danger',
  dangerSoft: '--danger-soft',
  warning: '--warning',
  warningSoft: '--warning-soft',
  info: '--info',
  infoSoft: '--info-soft',
  overlay: '--overlay',
  shadowColor: '--shadow-color',
  navTileBg: '--nav-tile-bg',
  navTileBg2: '--nav-tile-bg2',
  navTileFg: '--nav-tile-fg',
  navTileActiveBg: '--nav-tile-active-bg',
  navTileActiveFg: '--nav-tile-active-fg',
  navTileActiveRing: '--nav-tile-active-ring',
  shadowXs: '--shadow-xs',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  r: '--r',
  rSm: '--r-sm',
  rPill: '--r-pill',
  red: '--red',
  redBorder: '--red-border',
  // Fonts have only ONE canonical CSS var name (Tailwind's @theme already
  // calls it --font-sans/--font-display, and plain CSS -- body{font-family}
  // in index.css -- references that SAME name directly) -- no separate
  // unprefixed alias to also mirror, unlike the color tokens above.
  fontSans: '--font-sans',
  fontDisplay: '--font-display',
}

// Only the color-ish keys have a `--color-*` Tailwind counterpart worth
// mirroring — shadows/radii aren't referenced via Tailwind's @theme utilities.
const TAILWIND_COLOR_KEYS: ReadonlyArray<keyof typeof designTokens> = [
  'cream', 'ivory', 'bg3', 'sage', 'sageD', 'terra', 'terraD',
  'brown', 'brown2', 'brown3', 'border', 'red', 'btnBg', 'btnText', 'accentSoft',
  'success', 'successSoft', 'danger', 'dangerSoft', 'warning', 'warningSoft', 'info', 'infoSoft',
]
const TAILWIND_VAR_NAME: Partial<Record<keyof typeof designTokens, string>> = {
  cream: '--color-cream',
  ivory: '--color-ivory',
  bg3: '--color-bg3',
  sage: '--color-sage',
  sageD: '--color-sage-d',
  terra: '--color-terra',
  terraD: '--color-terra-d',
  brown: '--color-brown',
  brown2: '--color-brown-2',
  brown3: '--color-brown-3',
  border: '--color-border',
  red: '--color-red',
  btnBg: '--color-btn-bg',
  btnText: '--color-btn-text',
  accentSoft: '--color-accent-soft',
  success: '--color-success',
  successSoft: '--color-success-soft',
  danger: '--color-danger',
  dangerSoft: '--color-danger-soft',
  warning: '--color-warning',
  warningSoft: '--color-warning-soft',
  info: '--color-info',
  infoSoft: '--color-info-soft',
}

export function injectDesignTokens(overrides?: Partial<Record<keyof typeof designTokens, string>>): void {
  const root = document.documentElement
  const merged = { ...designTokens, ...overrides }
  for (const key of Object.keys(merged) as Array<keyof typeof designTokens>) {
    root.style.setProperty(CSS_VAR_NAME[key], merged[key])
    const tailwindVar = TAILWIND_VAR_NAME[key]
    if (tailwindVar && TAILWIND_COLOR_KEYS.includes(key)) {
      root.style.setProperty(tailwindVar, merged[key])
    }
  }
}
