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
  shadowXs: '0 1px 4px rgba(62,54,46,.07)',
  shadowSm: '0 2px 10px rgba(62,54,46,.09)',
  shadowMd: '0 8px 28px rgba(62,54,46,.13)',
  shadowLg: '0 20px 56px rgba(62,54,46,.18)',
  r: '12px',
  rSm: '8px',
  rPill: '100px',
  red: '#C04020',
  redBorder: 'rgba(192,64,32,.3)',
} as const

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
  shadowXs: '--shadow-xs',
  shadowSm: '--shadow-sm',
  shadowMd: '--shadow-md',
  shadowLg: '--shadow-lg',
  r: '--r',
  rSm: '--r-sm',
  rPill: '--r-pill',
  red: '--red',
  redBorder: '--red-border',
}

export function injectDesignTokens(): void {
  const root = document.documentElement
  for (const key of Object.keys(designTokens) as Array<keyof typeof designTokens>) {
    root.style.setProperty(CSS_VAR_NAME[key], designTokens[key])
  }
}
