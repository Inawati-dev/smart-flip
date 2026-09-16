// Theme picker (Pengaturan.tsx) — swaps design tokens at runtime via
// injectDesignTokens(). Hanya dua tema (permintaan Johan 16 Sep 2026 —
// "selain light dan dark mode dihapus saja"): Light (parchment/netral
// terang lama) dan Dark, pasangan gelapnya. Empat tema lain (Bawaan,
// Claude, Soft Pill, Executive) dihapus dari daftar; nilai tersimpan lama
// dipetakan ke 'light' oleh getTheme() di bawah supaya pengguna lama tidak
// mendapat tema yang sudah tidak ada.

export type ThemeId = 'light' | 'dark'

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
  // Token status semantik (antrean #42) — dipakai lewat kelas Tailwind
  // bg-success-soft/text-success dsb (lihat design-tokens.ts) untuk chip
  // status, pesan error, dan badge yang sebelumnya pakai hex mentah.
  success: string
  successSoft: string
  danger: string
  dangerSoft: string
  warning: string
  warningSoft: string
  info: string
  infoSoft: string
  // Latar modal (overlay) dan warna dasar bayangan — dulu ditulis mentah
  // sebagai rgba(62,54,46,...) di tiap modal, jadi kelihatan salah di Dark.
  overlay: string
  shadowColor: string
  navTileBg: string
  navTileBg2: string
  navTileFg: string
  navTileActiveBg: string
  navTileActiveFg: string
  navTileActiveRing: string
  fontSans: string
  fontDisplay: string
  r: string
}

export const THEMES: Record<ThemeId, { label: string; desc: string; colors: ThemeColors }> = {
  light: {
    label: 'Light',
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
      // Empat pasang status: teks jenuh gelap di atas latar lembut terang —
      // hijau/merah/amber/biru sudah dipakai di berbagai badge app (Dashboard,
      // AsesmenMhs, RecentActivityCard) dengan nilai yang sama persis, jadi
      // dikonsolidasi jadi token di sini alih-alih diulang per berkas.
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
      navTileBg: '#FFFFFF',
      navTileBg2: '#F1F1F0',
      navTileFg: '#57534E',
      navTileActiveBg: 'rgba(59,166,241,.14)',
      navTileActiveFg: '#1D5FA8',
      navTileActiveRing: 'rgba(59,166,241,.55)',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Inter', ui-sans-serif, system-ui, sans-serif",
      r: '12px',
    },
  },
  // Pasangan gelap dari Light (permintaan Johan 16 Sep 2026): latar gelap
  // kebiruan, teks terang, aksen biru yang sama. Kontras teks utama pada
  // latar kartu: #E7EAF0 di atas #1B2130 = 12,9:1; teks sekunder #A9B1C2 di
  // atas #1B2130 = 7,0:1 (dihitung rumus WCAG saat ditulis).
  dark: {
    label: 'Dark',
    desc: 'Gelap kebiruan, aksen biru; pasangan tema Light.',
    colors: {
      cream: '#12161F',
      ivory: '#1B2130',
      bg3: '#242B3C',
      terra: '#3BA6F1',
      terraD: '#6BBDF5',
      brown: '#E7EAF0',
      brown2: '#A9B1C2',
      brown3: '#7C8597',
      brown4: '#4E586B',
      border: '#2E3748',
      border2: '#27303F',
      btnBg: '#3BA6F1',
      btnText: '#0B1220',
      accentSoft: 'rgba(59,166,241,.16)',
      // Kontras terhadap latar kartu Dark (#1B2130), dihitung rumus WCAG
      // relative-luminance saat ditulis (16 Sep 2026): success #4ADE80 =
      // 9,22:1; danger #F87171 = 5,81:1. Keduanya di atas ambang 4,5:1.
      success: '#4ADE80',
      successSoft: 'rgba(74,222,128,.16)',
      danger: '#F87171',
      dangerSoft: 'rgba(248,113,113,.16)',
      warning: '#FBBF24',
      warningSoft: 'rgba(251,191,36,.16)',
      info: '#38BDF8',
      infoSoft: 'rgba(56,189,248,.16)',
      overlay: 'rgba(0,0,0,.55)',
      shadowColor: '#000000',
      navTileBg: '#2C3447',
      navTileBg2: '#232B3B',
      navTileFg: '#C9D1E0',
      navTileActiveBg: 'rgba(59,166,241,.20)',
      navTileActiveFg: '#7CC4F6',
      navTileActiveRing: 'rgba(59,166,241,.50)',
      fontSans: "'Inter', ui-sans-serif, system-ui, sans-serif",
      fontDisplay: "'Inter', ui-sans-serif, system-ui, sans-serif",
      r: '12px',
    },
  },
}

const KEY = 'sfp_theme'

// Nilai lama dari sebelum antrean #42 (tema dipangkas jadi dua) — dipetakan
// ke pengganti terdekatnya supaya localStorage pengguna lama tidak macet di
// tema yang sudah tidak ada di THEMES.
const LEGACY_MAP: Record<string, ThemeId> = {
  seline: 'light',
  bawaan: 'light',
  claude: 'light',
  'soft-pill': 'light',
  executive: 'light',
}

export function getTheme(): ThemeId {
  try {
    const v = localStorage.getItem(KEY)
    if (v && v in THEMES) return v as ThemeId
    if (v && v in LEGACY_MAP) return LEGACY_MAP[v]
  } catch {
    // ignore — falls through to default
  }
  return 'light'
}

export function setTheme(theme: ThemeId): void {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // ignore — worst case the choice doesn't persist across visits
  }
}
