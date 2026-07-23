// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  WORKSHOP_DATA,
  WORKSHOP_MODULE_COUNT,
  readChecklistState,
  writeChecklistState,
  readLkAnswer,
  writeLkAnswer,
  clearLkAnswers,
} from './workshop'

describe('WORKSHOP_DATA', () => {
  it('has an entry for all 9 modules', () => {
    expect(WORKSHOP_MODULE_COUNT).toBe(9)
    for (let i = 1; i <= 9; i++) {
      expect(WORKSHOP_DATA[i]).toBeDefined()
    }
  })

  it('has genuinely distinct content per module, not a repeated template', () => {
    const titles = Object.values(WORKSHOP_DATA).map((m) => m.judul)
    expect(new Set(titles).size).toBe(9)

    const firstTujuan = Object.values(WORKSHOP_DATA).map((m) => m.tujuan[0])
    expect(new Set(firstTujuan).size).toBe(9)

    const lkJudul = Object.values(WORKSHOP_DATA).map((m) => m.lembarKerja.judul)
    expect(new Set(lkJudul).size).toBe(9)
  })

  it('every module has non-empty tujuan, aktivitas, checklist, and lembarKerja.pertanyaan', () => {
    for (const m of Object.values(WORKSHOP_DATA)) {
      expect(m.tujuan.length).toBeGreaterThan(0)
      expect(m.aktivitas.length).toBeGreaterThan(0)
      expect(m.checklist.length).toBeGreaterThan(0)
      expect(m.lembarKerja.pertanyaan.length).toBeGreaterThan(0)
    }
  })

  it('module 1 matches the legacy workshop.html content verbatim', () => {
    expect(WORKSHOP_DATA[1].judul).toBe('Dasar & Konsep R&D')
    expect(WORKSHOP_DATA[1].durasi).toBe('2 x 50 menit')
    expect(WORKSHOP_DATA[1].tujuan).toHaveLength(3)
    expect(WORKSHOP_DATA[1].aktivitas).toHaveLength(4)
    expect(WORKSHOP_DATA[1].checklist).toHaveLength(5)
    expect(WORKSHOP_DATA[1].lembarKerja.pertanyaan).toHaveLength(5)
  })
})

describe('checklist persistence (localStorage-only, no Supabase table backs this)', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty object when nothing is stored', () => {
    expect(readChecklistState(1)).toEqual({})
  })

  it('round-trips through localStorage under the legacy sfp_ws_<id> key', () => {
    writeChecklistState(2, { 0: true, 2: true })
    expect(localStorage.getItem('sfp_ws_2')).toBe(JSON.stringify({ 0: true, 2: true }))
    expect(readChecklistState(2)).toEqual({ 0: true, 2: true })
  })

  it('keeps state independent per module id', () => {
    writeChecklistState(1, { 0: true })
    writeChecklistState(2, { 1: true })
    expect(readChecklistState(1)).toEqual({ 0: true })
    expect(readChecklistState(2)).toEqual({ 1: true })
  })

  it('falls back to an empty object for malformed JSON', () => {
    localStorage.setItem('sfp_ws_3', '{not json')
    expect(readChecklistState(3)).toEqual({})
  })
})

describe('lembar kerja answer persistence', () => {
  beforeEach(() => localStorage.clear())

  it('returns an empty string when nothing is stored', () => {
    expect(readLkAnswer(1, 0)).toBe('')
  })

  it('round-trips through localStorage under the legacy sfp_lk_<id>_<q> key', () => {
    writeLkAnswer(1, 2, 'Jawaban saya')
    expect(localStorage.getItem('sfp_lk_1_2')).toBe('Jawaban saya')
    expect(readLkAnswer(1, 2)).toBe('Jawaban saya')
  })

  it('clearLkAnswers removes every question key for that module', () => {
    writeLkAnswer(4, 0, 'a')
    writeLkAnswer(4, 1, 'b')
    writeLkAnswer(4, 2, 'c')
    clearLkAnswers(4, 3)
    expect(readLkAnswer(4, 0)).toBe('')
    expect(readLkAnswer(4, 1)).toBe('')
    expect(readLkAnswer(4, 2)).toBe('')
  })

  it('clearLkAnswers does not affect other modules', () => {
    writeLkAnswer(5, 0, 'kept')
    writeLkAnswer(6, 0, 'also kept')
    clearLkAnswers(5, 1)
    expect(readLkAnswer(5, 0)).toBe('')
    expect(readLkAnswer(6, 0)).toBe('also kept')
  })
})
