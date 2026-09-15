import { describe, it, expect } from 'vitest'
import { gabungKejadian, ringkasKelas, perluPerhatian, matriksProgres, type SumberAktivitas } from './aktivitas'

const MODULES = [
  { id: 1, orderNum: 1, title: 'Modul 1' },
  { id: 2, orderNum: 2, title: 'Modul 2' },
  { id: 3, orderNum: 3, title: 'Modul 3' },
]

function profil(id: string, fullName: string, overrides: Partial<SumberAktivitas['profiles'][number]> = {}) {
  return {
    id,
    fullName,
    classId: 'kelas-a',
    kelasNama: 'Kelas A',
    createdAt: '2026-08-01T00:00:00.000Z',
    varkCompletedAt: null,
    ...overrides,
  }
}

const NOW = new Date('2026-09-15T00:00:00.000Z')

describe('gabungKejadian', () => {
  it('pre-test selesai jadi jenis "pre" dan urut waktu menurun', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Ahmad', { classId: null, kelasNama: null })],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: null, score: 70, kind: 'pre', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
        { userId: 'u1', moduleId: 1, score: 85, kind: 'formatif', attemptedAt: '2026-09-02T00:00:00.000Z', sessionId: null },
      ],
    }
    const hasil = gabungKejadian(sumber)
    expect(hasil).toHaveLength(2)
    expect(hasil[0].jenis).toBe('formatif-lulus') // lebih baru, di atas
    expect(hasil[1].jenis).toBe('pre')
    expect(hasil[1].keterangan).toContain('skor 70')
  })

  it('formatif skor >= 80 jadi "formatif-lulus", < 80 jadi "formatif-remedial"', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Budi')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: 1, score: 80, kind: 'formatif', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
        { userId: 'u1', moduleId: 1, score: 60, kind: 'formatif', attemptedAt: '2026-09-02T00:00:00.000Z', sessionId: null },
      ],
    }
    const [remedial, lulus] = gabungKejadian(sumber)
    expect(remedial.jenis).toBe('formatif-remedial')
    expect(lulus.jenis).toBe('formatif-lulus')
  })

  it('attempt dengan session_id jadi jenis "tes-khusus" walau kind=post', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Citra')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [{ userId: 'u1', moduleId: null, score: 90, kind: 'post', attemptedAt: '2026-09-05T00:00:00.000Z', sessionId: 'sesi-1' }],
    }
    expect(gabungKejadian(sumber)[0].jenis).toBe('tes-khusus')
  })

  it('modul dibaca, video ditonton, VARK selesai, dan gabung kelas masing-masing muncul', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Dian', { varkCompletedAt: '2026-09-03T00:00:00.000Z' })],
      modules: MODULES,
      attempts: [],
      progress: [{ userId: 'u1', moduleId: 1, currentPage: 5, lastOpened: '2026-09-04T00:00:00.000Z' }],
      video: [{ userId: 'u1', moduleId: 1, seconds: 120, done: true, updatedAt: '2026-09-06T00:00:00.000Z' }],
    }
    const jenis = gabungKejadian(sumber).map((k) => k.jenis).sort()
    expect(jenis).toEqual(['gabung', 'modul', 'vark', 'video'])
  })
})

describe('ringkasKelas', () => {
  it('preSelesai menghitung mahasiswa unik yang sudah pre-test', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'A'), profil('u2', 'B')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: null, score: 70, kind: 'pre', attemptedAt: '2026-09-10T00:00:00.000Z', sessionId: null },
      ],
    }
    const ringkas = ringkasKelas(sumber, { now: NOW })
    expect(ringkas.preSelesai).toBe(1)
    expect(ringkas.totalMhs).toBe(2)
  })

  it('topikRataRata mengambil median topik tertinggi yang lulus per mahasiswa', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'A'), profil('u2', 'B'), profil('u3', 'C')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        // u1 lulus modul 1 & 2 -> tertinggi 2
        { userId: 'u1', moduleId: 1, score: 80, kind: 'formatif', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
        { userId: 'u1', moduleId: 2, score: 85, kind: 'formatif', attemptedAt: '2026-09-02T00:00:00.000Z', sessionId: null },
        // u2 lulus modul 3 -> tertinggi 3
        { userId: 'u2', moduleId: 3, score: 90, kind: 'formatif', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
        // u3 belum lulus apapun -> 0
      ],
    }
    // nilai per mahasiswa: [0, 2, 3] -> median = 2
    expect(ringkasKelas(sumber, { now: NOW }).topikRataRata).toBe('P2')
  })

  it('remedial7Hari hanya menghitung formatif gagal dalam 7 hari terakhir dari "now"', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'A')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: 1, score: 50, kind: 'formatif', attemptedAt: '2026-09-14T00:00:00.000Z', sessionId: null }, // 1 hari lalu
        { userId: 'u1', moduleId: 1, score: 50, kind: 'formatif', attemptedAt: '2026-08-01T00:00:00.000Z', sessionId: null }, // jauh di luar 7 hari
      ],
    }
    expect(ringkasKelas(sumber, { now: NOW }).remedial7Hari).toBe(1)
  })

  it('aktif7Hari menghitung mahasiswa dengan aktivitas terbaru dalam jendela hari, sisanya tidak', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Aktif'), profil('u2', 'TidakAktif')],
      modules: MODULES,
      video: [],
      progress: [{ userId: 'u1', moduleId: 1, currentPage: 3, lastOpened: '2026-09-14T00:00:00.000Z' }],
      attempts: [{ userId: 'u2', moduleId: null, score: 70, kind: 'pre', attemptedAt: '2026-08-01T00:00:00.000Z', sessionId: null }],
    }
    expect(ringkasKelas(sumber, { now: NOW }).aktif7Hari).toBe(1)
  })
})

describe('perluPerhatian', () => {
  it('menandai mahasiswa yang belum pre-test dan yang tidak aktif >7 hari', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Belum Pre'), profil('u2', 'Tidak Aktif', {})],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [{ userId: 'u2', moduleId: null, score: 70, kind: 'pre', attemptedAt: '2026-08-01T00:00:00.000Z', sessionId: null }],
    }
    const hasil = perluPerhatian(sumber, { now: NOW })
    const keterangan = hasil.map((h) => h.keterangan)
    expect(keterangan).toContain('Belum mengerjakan pre-test')
    expect(keterangan.some((k) => k.includes('Tidak aktif'))).toBe(true)
  })

  it('menandai remedial lebih dari 2 kali pada satu modul', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Remedial Berat')],
      modules: MODULES,
      progress: [{ userId: 'u1', moduleId: 1, currentPage: 5, lastOpened: NOW.toISOString() }],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: null, score: 70, kind: 'pre', attemptedAt: NOW.toISOString(), sessionId: null },
        { userId: 'u1', moduleId: 1, score: 40, kind: 'formatif', attemptedAt: NOW.toISOString(), sessionId: null },
        { userId: 'u1', moduleId: 1, score: 50, kind: 'formatif', attemptedAt: NOW.toISOString(), sessionId: null },
        { userId: 'u1', moduleId: 1, score: 60, kind: 'formatif', attemptedAt: NOW.toISOString(), sessionId: null },
      ],
    }
    const hasil = perluPerhatian(sumber, { now: NOW })
    expect(hasil.some((h) => h.keterangan.includes('Remedial 3 kali di modul 1'))).toBe(true)
  })
})

describe('matriksProgres', () => {
  it('menandai L untuk lulus, R untuk sudah dicoba tapi belum lulus, - untuk belum dicoba', () => {
    const sumber: SumberAktivitas = {
      profiles: [profil('u1', 'Mhs 1')],
      modules: MODULES,
      progress: [],
      video: [],
      attempts: [
        { userId: 'u1', moduleId: 1, score: 85, kind: 'formatif', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
        { userId: 'u1', moduleId: 2, score: 50, kind: 'formatif', attemptedAt: '2026-09-01T00:00:00.000Z', sessionId: null },
      ],
    }
    const [baris] = matriksProgres(sumber)
    expect(baris.sel.map((s) => s.status)).toEqual(['L', 'R', '-'])
  })
})
