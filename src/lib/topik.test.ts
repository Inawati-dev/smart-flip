import { describe, it, expect } from 'vitest'
import { hitungStatusTopik } from './topik'

const MODULES = [{ id: 1 }, { id: 2 }, { id: 3 }]

describe('hitungStatusTopik', () => {
  it('belum pre-test: semua topik terkunci', () => {
    const statusOf = hitungStatusTopik(MODULES, {}, false)
    expect(statusOf(1)).toBe('locked')
    expect(statusOf(2)).toBe('locked')
    expect(statusOf(3)).toBe('locked')
  })

  it('pre-test saja (belum ada formatif): topik 1 open, sisanya terkunci', () => {
    const statusOf = hitungStatusTopik(MODULES, {}, true)
    expect(statusOf(1)).toBe('open')
    expect(statusOf(2)).toBe('locked')
    expect(statusOf(3)).toBe('locked')
  })

  it('topik 1 lulus skor 85: topik 1 done, topik 2 terbuka', () => {
    const statusOf = hitungStatusTopik(MODULES, { 1: 85 }, true)
    expect(statusOf(1)).toBe('done')
    expect(statusOf(2)).toBe('open')
    expect(statusOf(3)).toBe('locked')
  })

  it('topik 1 remedial skor 64: topik 1 tetap open (bukan done), topik 2 tetap terkunci', () => {
    const statusOf = hitungStatusTopik(MODULES, { 1: 64 }, true)
    expect(statusOf(1)).toBe('open')
    expect(statusOf(2)).toBe('locked')
  })

  // Antrean #105 opsi B: Mahir membuka semua topik sesudah pre-test.
  it('mahir opens every topic once pre-test is done, done still needs formatif >= 80', () => {
    const statusOf = hitungStatusTopik(MODULES, { 1: 90 }, true, 80, true)
    expect(statusOf(MODULES[0].id)).toBe('done')
    expect(statusOf(MODULES[MODULES.length - 1].id)).toBe('open')
  })

  it('mahir without pre-test done stays locked', () => {
    const statusOf = hitungStatusTopik(MODULES, {}, false, 80, true)
    expect(statusOf(MODULES[MODULES.length - 1].id)).toBe('locked')
  })
  // Antrean #153: kunci jadwal berlaku untuk semua golongan, kecuali topik yang sudah lulus.
  it('materi yang belum waktunya terkunci walau golongan mahir; yang sudah lulus tetap done', () => {
    const belumWaktunya = (id: number) => id === 1
    const statusOf = hitungStatusTopik(MODULES, { 2: 90 }, true, 70, true, belumWaktunya)
    expect(statusOf(MODULES[0].id)).toBe('open')
    expect(statusOf(MODULES[1].id)).toBe('done')
    expect(statusOf(MODULES[2].id)).toBe('locked')
  })
})
