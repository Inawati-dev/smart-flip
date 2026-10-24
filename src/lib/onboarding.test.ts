// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import { hasSeenOnboarding, markOnboardingSeen, resetOnboarding, resetSemuaOnboarding } from './onboarding'

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
})

describe('onboarding sekali per login (antrean #306)', () => {
  it('tanda bertahan di localStorage, jadi tab baru yang masih login tidak memunculkan modal', () => {
    markOnboardingSeen('dosen')
    sessionStorage.clear() // tab baru: sessionStorage kosong
    expect(hasSeenOnboarding('dosen')).toBe(true)
    expect(hasSeenOnboarding('mahasiswa')).toBe(false)
  })

  it('login baru menghapus tanda kedua peran', () => {
    markOnboardingSeen('dosen')
    markOnboardingSeen('mahasiswa')
    resetSemuaOnboarding()
    expect(hasSeenOnboarding('dosen')).toBe(false)
    expect(hasSeenOnboarding('mahasiswa')).toBe(false)
  })

  it('keluar menghapus tanda peran itu saja', () => {
    markOnboardingSeen('dosen')
    markOnboardingSeen('mahasiswa')
    resetOnboarding('dosen')
    expect(hasSeenOnboarding('dosen')).toBe(false)
    expect(hasSeenOnboarding('mahasiswa')).toBe(true)
  })
})
