import { describe, it, expect, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {}, isSupabaseConfigured: false }))

import { slugJudul, dasarNamaBerkas } from './manajemen'

// Antrean #327: nama berkas unggahan mengikuti Bab dan judul topik.
describe('slugJudul', () => {
  it('huruf kecil, tanpa aksen, simbol jadi tanda hubung, maks 40 karakter', () => {
    expect(slugJudul('Dasar & Konsep R&D')).toBe('dasar-konsep-r-d')
    expect(slugJudul('Évaluasi  Kualitatif!')).toBe('evaluasi-kualitatif')
    expect(slugJudul('Model R&D (ADDIE, 4D, Borg & Gall) dan Langkah Pengembangannya').length).toBeLessThanOrEqual(40)
    expect(slugJudul('Model R&D (ADDIE, 4D, Borg & Gall) dan Langkah Pengembangannya')).not.toMatch(/-$/)
    expect(slugJudul('***')).toBe('')
  })
})

describe('dasarNamaBerkas', () => {
  const urut = [
    { id: 9, title: 'Pendahuluan', jenis: 'bagian' },
    { id: 1, title: 'Konsep Dasar dan Paradigma Penelitian', jenis: 'bab' },
    { id: 2, title: 'Rumusan Masalah' },
    { id: 8, title: 'Penutup', jenis: 'bagian' },
    { id: 3, title: '???' },
  ]
  it('Bab memakai nomor Bab yang melewati Bagian', () => {
    expect(dasarNamaBerkas(urut, 1)).toBe('bab-1-konsep-dasar-dan-paradigma-penelitian')
    expect(dasarNamaBerkas(urut, 2)).toBe('bab-2-rumusan-masalah')
  })
  it('Bagian tanpa nomor', () => {
    expect(dasarNamaBerkas(urut, 9)).toBe('bagian-pendahuluan')
    expect(dasarNamaBerkas(urut, 8)).toBe('bagian-penutup')
  })
  it('judul tanpa huruf/angka dan id tak dikenal', () => {
    expect(dasarNamaBerkas(urut, 3)).toBe('bab-3')
    expect(dasarNamaBerkas(urut, 77)).toBe('topik-77')
  })
})
