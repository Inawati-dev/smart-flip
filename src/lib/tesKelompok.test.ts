import { describe, it, expect } from 'vitest'
import { rataKelompok, kelompokkanHasil, type GroupResultRow } from './tesKelompok'

describe('rataKelompok', () => {
  it('rata-rata yang sudah mengerjakan saja', () => {
    expect(rataKelompok([{ score: 80 }, { score: null }, { score: 61 }])).toBe(71)
    expect(rataKelompok([{ score: null }])).toBeNull()
    expect(rataKelompok([])).toBeNull()
  })
})

describe('kelompokkanHasil', () => {
  it('mengelompokkan per nomor, kelompok kosong tetap muncul', () => {
    const rows: GroupResultRow[] = [
      { team_number: 2, code: 'BBBBBB', user_id: 'u1', full_name: 'Ani', score: 90, attempted_at: null },
      { team_number: 1, code: 'AAAAAA', user_id: null, full_name: null, score: null, attempted_at: null },
      { team_number: 2, code: 'BBBBBB', user_id: 'u2', full_name: 'Budi', score: 70, attempted_at: null },
    ]
    const g = kelompokkanHasil(rows)
    expect(g.map((x) => x.number)).toEqual([1, 2])
    expect(g[0].anggota).toHaveLength(0)
    expect(g[0].rata).toBeNull()
    expect(g[1].anggota.map((a) => a.full_name)).toEqual(['Ani', 'Budi'])
    expect(g[1].rata).toBe(80)
  })
})
