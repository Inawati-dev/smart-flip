import { describe, it, expect } from 'vitest'
import {
  PAKET_PROPOSAL,
  BOBOT_BAWAAN,
  AKTIVITAS_MANDIRI,
  aktivitasTopik,
  bobotSah,
  briefPaket,
  nilaiMiniProjek,
  statusBab,
  tautanSah,
  bobotPaket,
  tenggatBawaan,
  topikTerbukaDari,
} from './paketProposal'
import type { FinalProject } from './tugasAkhir'

const [bab1, bab2, bab3, rancangan] = PAKET_PROPOSAL
const buka = () => true
const tutup = () => false

describe('PAKET_PROPOSAL', () => {
  it('empat bab, bobot bawaan 20/20/25/35 berjumlah 100', () => {
    expect(BOBOT_BAWAAN).toEqual([20, 20, 25, 35])
    expect(bobotSah(BOBOT_BAWAAN)).toBe(true)
  })
  it('tiap rubrik berjumlah 100 dan hanya Bab 3 yang butuh tautan', () => {
    for (const b of PAKET_PROPOSAL) expect(b.rubrik.reduce((a, r) => a + r.bobot, 0)).toBe(100)
    expect(PAKET_PROPOSAL.map((b) => b.butuhTautan)).toEqual([false, false, true, false])
  })
  it('enam topik punya Aktivitas Mandiri dan menunjuk bab yang memuat topiknya', () => {
    expect(AKTIVITAS_MANDIRI.map((a) => a.topik)).toEqual([1, 2, 3, 4, 5, 6])
    for (const a of AKTIVITAS_MANDIRI) {
      expect(a.langkah.length).toBeGreaterThanOrEqual(6)
      expect(PAKET_PROPOSAL[a.bab - 1].topik).toContain(a.topik)
    }
    expect(aktivitasTopik(7)).toBeNull()
  })
})

describe('statusBab', () => {
  it('Bab 1 terkunci sebelum Topik 1 dibuka, belum dikirim sesudahnya', () => {
    expect(statusBab(bab1, null, tutup, false)).toBe('terkunci')
    expect(statusBab(bab1, null, (n) => n === 1, false)).toBe('belum')
  })
  it('Bab 2 mengikuti Topik 4, tidak menunggu nilai Bab 1', () => {
    expect(statusBab(bab2, null, (n) => n <= 3, false)).toBe('terkunci')
    expect(statusBab(bab2, null, (n) => n <= 4, false)).toBe('belum')
  })
  it('Bab 3 terbuka sejak Topik 5 walau Topik 6 belum', () => {
    expect(statusBab(bab3, null, (n) => n <= 5, false)).toBe('belum')
  })
  it('Rancangan Proposal hanya terbuka sesudah Bab 3 dinilai', () => {
    expect(statusBab(rancangan, null, buka, false)).toBe('terkunci')
    expect(statusBab(rancangan, null, tutup, true)).toBe('belum')
  })
  it('kiriman yang ada menang atas kunci jadwal', () => {
    expect(statusBab(bab2, { graded_at: null }, tutup, false)).toBe('terkirim')
    expect(statusBab(bab2, { graded_at: '2026-10-11T00:00:00Z' }, tutup, false)).toBe('dinilai')
  })
})

describe('nilaiMiniProjek', () => {
  it('20% Bab 1 + 20% Bab 2 + 25% Bab 3 + 35% naskah lengkap', () => {
    expect(nilaiMiniProjek(BOBOT_BAWAAN, [80, 70, 90, 60])).toBe(74) // 16 + 14 + 22,5 + 21 = 73,5
    expect(nilaiMiniProjek(BOBOT_BAWAAN, [100, 100, 100, 100])).toBe(100)
  })
  it('null selama ada bab yang belum dinilai atau bobot tidak sah', () => {
    expect(nilaiMiniProjek(BOBOT_BAWAAN, [80, 70, 90, null])).toBeNull()
    expect(nilaiMiniProjek([25, 25, 25, 30], [80, 70, 90, 60])).toBeNull()
  })
})

describe('bobotSah', () => {
  it('menolak jumlah bukan 100, pecahan, negatif, dan jumlah bab yang salah', () => {
    expect(bobotSah([25, 25, 25, 25])).toBe(true)
    expect(bobotSah([25, 25, 25, 24])).toBe(false)
    expect(bobotSah([25.5, 24.5, 25, 25])).toBe(false)
    expect(bobotSah([-10, 60, 25, 25])).toBe(false)
    expect(bobotSah([50, 50])).toBe(false)
  })
})

describe('tautanSah', () => {
  it('menerima http dan https, menolak teks biasa dan kosong', () => {
    expect(tautanSah('https://www.figma.com/proto/abc')).toBe(true)
    expect(tautanSah(' http://contoh.id/p ')).toBe(true)
    expect(tautanSah('figma.com/proto')).toBe(false)
    expect(tautanSah('')).toBe(false)
    expect(tautanSah('http://')).toBe(false)
    expect(tautanSah('http://a.b javascript:alert(1)')).toBe(false)
  })
})

describe('briefPaket', () => {
  const p = (id: string, paket: string | null, urutan: number | null): FinalProject => ({
    id, dosen_id: 'd', title: id, description: '', deadline: null, rubric: [], class_ids: [], is_open: true,
    created_at: '', paket_id: paket, urutan,
  })
  it('mengambil paket terbaru, urut bab, dan melewatkan mini projek biasa', () => {
    const daftar = [p('lain', null, null), p('b3', 'P2', 3), p('b1', 'P2', 1), p('lama1', 'P1', 1), p('b4', 'P2', 4), p('b2', 'P2', 2)]
    expect(briefPaket(daftar).map((x) => x.id)).toEqual(['b1', 'b2', 'b3', 'b4'])
    expect(briefPaket([p('lain', null, null)])).toEqual([])
  })
  it('bobotPaket memakai bobot tersimpan bila sah, bawaan bila kosong atau jumlahnya bukan 100', () => {
    const b = (bobot: Array<number | null>) => bobot.map((x, i) => ({ ...p('b' + i, 'P', i + 1), bobot: x }))
    expect(bobotPaket(b([25, 25, 25, 25]))).toEqual([25, 25, 25, 25])
    expect(bobotPaket(b([null, null, null, null]))).toEqual(BOBOT_BAWAAN)
    expect(bobotPaket(b([30, 20, 25, 34]))).toEqual(BOBOT_BAWAAN)
  })
})

describe('jadwal paket', () => {
  const modul = [1, 2, 3, 4, 5, 6].map((id) => ({ id: id * 10 }))
  it('tanpa tanggal mulai semua topik terbuka dan tidak ada tenggat usulan', () => {
    expect(topikTerbukaDari(null, modul)(6)).toBe(true)
    expect(tenggatBawaan(null, modul)).toEqual([null, null, null, null])
  })
  it('topik terbuka mengikuti minggu bawaan: Topik 1 minggu 1, Topik 4 minggu 9', () => {
    const terbuka = topikTerbukaDari('2026-09-07', modul, new Date(2026, 8, 20)) // minggu ke-2
    expect(terbuka(1)).toBe(true)
    expect(terbuka(2)).toBe(false)
    expect(terbuka(4)).toBe(false)
    expect(terbuka(9)).toBe(true) // topik yang tidak ada di mata kuliah ini tidak mengunci
    expect(topikTerbukaDari('2026-09-07', modul, new Date(2026, 10, 2))(4)).toBe(true) // awal minggu ke-9
  })
  it('tenggat usulan Bab 1 = awal minggu ke-7 (Topik 3 mulai minggu 5), Rancangan Proposal kosong', () => {
    const t = tenggatBawaan('2026-09-07', modul)
    expect(new Date(t[0]!).getTime()).toBe(new Date(2026, 9, 19).getTime())
    expect(t[1]).not.toBeNull()
    expect(t[3]).toBeNull()
  })
})
