// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { THEMES, getTheme, setTheme } from './theme'

beforeEach(() => {
  localStorage.clear()
})

describe('THEMES', () => {
  it('hanya punya dua tema: light dan dark (antrean #42)', () => {
    expect(Object.keys(THEMES).sort()).toEqual(['dark', 'light'])
  })

  it('tiap tema punya semua token status semantik', () => {
    for (const id of Object.keys(THEMES) as Array<keyof typeof THEMES>) {
      const c = THEMES[id].colors
      expect(c.success).toBeTruthy()
      expect(c.successSoft).toBeTruthy()
      expect(c.danger).toBeTruthy()
      expect(c.dangerSoft).toBeTruthy()
      expect(c.warning).toBeTruthy()
      expect(c.warningSoft).toBeTruthy()
      expect(c.info).toBeTruthy()
      expect(c.infoSoft).toBeTruthy()
      expect(c.overlay).toBeTruthy()
      expect(c.shadowColor).toBeTruthy()
    }
  })
})

describe('getTheme', () => {
  it('bawaan (localStorage kosong) adalah light', () => {
    expect(getTheme()).toBe('light')
  })

  it('mengingat pilihan tersimpan', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
  })

  it('memetakan nilai lama (seline) ke light', () => {
    localStorage.setItem('sfp_theme', 'seline')
    expect(getTheme()).toBe('light')
  })

  it.each(['bawaan', 'claude', 'soft-pill', 'executive'])(
    'memetakan tema lama %s yang sudah dihapus ke light',
    (legacy) => {
      localStorage.setItem('sfp_theme', legacy)
      expect(getTheme()).toBe('light')
    },
  )

  it('nilai sampah (bukan tema lama maupun baru) tetap jatuh ke light', () => {
    localStorage.setItem('sfp_theme', 'entah-apa')
    expect(getTheme()).toBe('light')
  })
})
