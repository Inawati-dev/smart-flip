import { describe, it, expect } from 'vitest'
import {
  buildObservasiCsv,
  computeMahasiswaProgress,
  computeTugasProgress,
  formatTanggalObservasi,
  isTerlambat,
  jalurPengumpulan,
  ringkasObservasi,
  type ObservasiMahasiswa,
  type ObservasiStatus,
  type ObservasiSubmission,
  type ObservasiTugas,
} from './observasi'

// ── Fixture helper — hanya field yang dipakai helper murni yang penting;
// sisanya diisi nilai netral supaya tiap test tetap enak dibaca. ──

function tugas(id: number, judul: string, deadline: string | null = null): ObservasiTugas {
  return {
    id,
    judul,
    deskripsi: '',
    moduleId: null,
    modulJudul: null,
    deadline,
    orderNum: id,
    createdBy: 'dosen-1',
    createdAt: '2026-01-01T00:00:00.000Z',
  }
}

function mhs(id: string, nama: string, kelas: string | null = 'Kelas A'): ObservasiMahasiswa {
  return { id, nama, kelas }
}

function jawaban(
  id: number,
  tugasId: number,
  userId: string,
  opts: Partial<Pick<ObservasiSubmission, 'isiTeks' | 'fileUrl' | 'status' | 'submittedAt'>> = {},
): ObservasiSubmission {
  return {
    id,
    tugasId,
    userId,
    nama: userId,
    kelas: 'Kelas A',
    isiTeks: opts.isiTeks ?? 'Hasil observasi...',
    fileUrl: opts.fileUrl ?? null,
    fileName: null,
    status: (opts.status ?? 'submitted') as ObservasiStatus,
    catatanDosen: null,
    submittedAt: opts.submittedAt ?? '2026-02-01T00:00:00.000Z',
    updatedAt: opts.submittedAt ?? '2026-02-01T00:00:00.000Z',
  }
}

describe('jalurPengumpulan', () => {
  it('membedakan empat kombinasi teks/berkas', () => {
    expect(jalurPengumpulan({ isiTeks: 'catatan', fileUrl: null })).toBe('teks')
    expect(jalurPengumpulan({ isiTeks: '', fileUrl: 'https://x/y.pdf' })).toBe('berkas')
    expect(jalurPengumpulan({ isiTeks: 'catatan', fileUrl: 'https://x/y.pdf' })).toBe('keduanya')
    expect(jalurPengumpulan({ isiTeks: '', fileUrl: null })).toBe('kosong')
  })

  it('menganggap teks berisi spasi saja sebagai kosong', () => {
    expect(jalurPengumpulan({ isiTeks: '   \n  ', fileUrl: null })).toBe('kosong')
  })
})

describe('isTerlambat', () => {
  it('true hanya kalau dikumpulkan setelah deadline', () => {
    expect(isTerlambat('2026-03-10T00:00:00.000Z', '2026-03-11T00:00:00.000Z')).toBe(true)
    expect(isTerlambat('2026-03-10T00:00:00.000Z', '2026-03-09T00:00:00.000Z')).toBe(false)
  })

  it('tugas tanpa deadline tidak pernah terlambat', () => {
    expect(isTerlambat(null, '2030-01-01T00:00:00.000Z')).toBe(false)
  })

  it('tanggal tidak valid dianggap tidak terlambat, bukan melempar error', () => {
    expect(isTerlambat('bukan-tanggal', '2026-03-11T00:00:00.000Z')).toBe(false)
    expect(isTerlambat('2026-03-10T00:00:00.000Z', 'bukan-tanggal')).toBe(false)
  })
})

describe('computeTugasProgress', () => {
  const tugasList = [tugas(1, 'Observasi Pasar'), tugas(2, 'Observasi Sekolah', '2026-02-01T00:00:00.000Z')]
  const students = [mhs('u1', 'Ahmad'), mhs('u2', 'Budi'), mhs('u3', 'Citra'), mhs('u4', 'Dian')]

  it('menghitung sudah/belum terhadap jumlah mahasiswa, bukan jumlah jawaban', () => {
    const subs = [jawaban(10, 1, 'u1'), jawaban(11, 1, 'u2')]
    const [t1, t2] = computeTugasProgress(tugasList, students, subs)

    expect(t1).toMatchObject({ tugasId: 1, totalMahasiswa: 4, sudah: 2, belum: 2, persen: 50 })
    // Tugas yang belum disentuh siapa pun harus 0%, bukan 100%.
    expect(t2).toMatchObject({ tugasId: 2, sudah: 0, belum: 4, persen: 0 })
  })

  it('memecah rincian status per tugas', () => {
    const subs = [
      jawaban(10, 1, 'u1', { status: 'submitted' }),
      jawaban(11, 1, 'u2', { status: 'reviewed' }),
      jawaban(12, 1, 'u3', { status: 'revision' }),
    ]
    expect(computeTugasProgress(tugasList, students, subs)[0]).toMatchObject({
      menunggu: 1,
      diperiksa: 1,
      perluRevisi: 1,
    })
  })

  it('menandai jawaban yang lewat deadline sebagai terlambat', () => {
    const subs = [
      jawaban(20, 2, 'u1', { submittedAt: '2026-01-20T00:00:00.000Z' }), // tepat waktu
      jawaban(21, 2, 'u2', { submittedAt: '2026-02-05T00:00:00.000Z' }), // telat
    ]
    expect(computeTugasProgress(tugasList, students, subs)[1].terlambat).toBe(1)
  })

  it('tidak pernah melewati 100% walau ada jawaban dari mahasiswa di luar daftar', () => {
    // Skenario nyata: mahasiswa pindah kelas SETELAH mengumpulkan, jadi
    // barisnya masih terbaca tapi dia tidak lagi ada di daftar kelas ini.
    const subs = [jawaban(10, 1, 'u1'), jawaban(11, 1, 'u2'), jawaban(12, 1, 'alumni')]
    const dua = [mhs('u1', 'Ahmad'), mhs('u2', 'Budi')]
    const hasil = computeTugasProgress([tugasList[0]], dua, subs)[0]
    expect(hasil.sudah).toBe(2)
    expect(hasil.persen).toBe(100)
    expect(hasil.belum).toBe(0)
  })

  it('persen 0 (tanpa bagi-nol) saat belum ada mahasiswa sama sekali', () => {
    expect(computeTugasProgress(tugasList, [], [])[0]).toMatchObject({ totalMahasiswa: 0, persen: 0, belum: 0 })
  })
})

describe('computeMahasiswaProgress', () => {
  const tugasList = [tugas(1, 'Observasi Pasar'), tugas(2, 'Observasi Sekolah'), tugas(3, 'Observasi UMKM')]
  const students = [mhs('u1', 'Ahmad'), mhs('u2', 'Budi', 'Kelas B')]

  it('menghitung berapa tugas yang sudah dikumpulkan tiap mahasiswa', () => {
    const subs = [jawaban(10, 1, 'u1'), jawaban(11, 3, 'u1'), jawaban(12, 2, 'u2', { status: 'revision' })]
    const [a, b] = computeMahasiswaProgress(tugasList, students, subs)

    expect(a).toMatchObject({ userId: 'u1', sudah: 2, totalTugas: 3, persen: 67, perluRevisi: 0 })
    expect(a.belumJudul).toEqual(['Observasi Sekolah'])
    expect(b).toMatchObject({ userId: 'u2', kelas: 'Kelas B', sudah: 1, persen: 33, perluRevisi: 1 })
    expect(b.belumJudul).toEqual(['Observasi Pasar', 'Observasi UMKM'])
  })

  it('mengabaikan jawaban untuk tugas yang sudah dihapus dosen', () => {
    const subs = [jawaban(10, 1, 'u1'), jawaban(99, 404, 'u1')]
    const hasil = computeMahasiswaProgress(tugasList, [students[0]], subs)[0]
    expect(hasil.sudah).toBe(1)
    expect(hasil.persen).toBe(33)
  })

  it('persen 0 saat belum ada tugas sama sekali', () => {
    const hasil = computeMahasiswaProgress([], students, [])
    expect(hasil[0]).toMatchObject({ sudah: 0, totalTugas: 0, persen: 0 })
    expect(hasil[0].belumJudul).toEqual([])
  })
})

describe('ringkasObservasi', () => {
  it('menghitung persen pengumpulan dari matriks tugas × mahasiswa', () => {
    const tugasList = [tugas(1, 'A'), tugas(2, 'B')]
    const students = [mhs('u1', 'Ahmad'), mhs('u2', 'Budi')]
    // 2 tugas × 2 mahasiswa = 4 sel, 3 terisi → 75%
    const subs = [
      jawaban(10, 1, 'u1', { status: 'reviewed' }),
      jawaban(11, 2, 'u1', { status: 'submitted' }),
      jawaban(12, 1, 'u2', { status: 'revision' }),
    ]
    expect(ringkasObservasi(tugasList, students, subs)).toEqual({
      totalTugas: 2,
      totalMahasiswa: 2,
      totalJawaban: 3,
      persenPengumpulan: 75,
      menunggu: 1,
      perluRevisi: 1,
    })
  })

  it('mengabaikan jawaban di luar matriks (tugas terhapus / mahasiswa pindah)', () => {
    const tugasList = [tugas(1, 'A')]
    const students = [mhs('u1', 'Ahmad')]
    const subs = [jawaban(10, 1, 'u1'), jawaban(11, 404, 'u1'), jawaban(12, 1, 'alumni')]
    expect(ringkasObservasi(tugasList, students, subs)).toMatchObject({ totalJawaban: 1, persenPengumpulan: 100 })
  })

  it('nol semua (tanpa bagi-nol) saat belum ada tugas maupun mahasiswa', () => {
    expect(ringkasObservasi([], [], [])).toEqual({
      totalTugas: 0,
      totalMahasiswa: 0,
      totalJawaban: 0,
      persenPengumpulan: 0,
      menunggu: 0,
      perluRevisi: 0,
    })
  })
})

describe('formatTanggalObservasi', () => {
  it('mengembalikan em dash untuk null dan tanggal tidak valid', () => {
    expect(formatTanggalObservasi(null)).toBe('—')
    expect(formatTanggalObservasi('bukan-tanggal')).toBe('—')
  })

  it('memformat ISO string ke tanggal Indonesia yang ringkas', () => {
    const hasil = formatTanggalObservasi('2026-02-01T10:00:00.000Z')
    expect(hasil).toMatch(/2026/)
    expect(hasil).not.toBe('—')
  })
})

describe('buildObservasiCsv', () => {
  it('menulis header plus satu baris per mahasiswa', () => {
    const csv = buildObservasiCsv([
      { userId: 'u1', nama: 'Ahmad', kelas: 'Kelas A', sudah: 2, totalTugas: 3, persen: 67, perluRevisi: 0, belumJudul: ['Observasi Sekolah'] },
      { userId: 'u2', nama: 'Budi', kelas: null, sudah: 0, totalTugas: 3, persen: 0, perluRevisi: 1, belumJudul: ['A', 'B'] },
    ])
    const baris = csv.trim().split('\n')
    expect(baris).toHaveLength(3)
    expect(baris[0]).toBe('Nama,Kelas,Sudah Kumpul,Total Tugas,Persen,Perlu Revisi,Belum Dikumpulkan')
    expect(baris[1]).toBe('"Ahmad","Kelas A",2,3,67,0,"Observasi Sekolah"')
    expect(baris[2]).toBe('"Budi","—",0,3,0,1,"A; B"')
  })

  it('meng-escape tanda kutip di nama, sesuai pola buildAsesmenCsv', () => {
    const csv = buildObservasiCsv([
      { userId: 'u1', nama: 'Ahmad "Rizki"', kelas: null, sudah: 0, totalTugas: 0, persen: 0, perluRevisi: 0, belumJudul: [] },
    ])
    expect(csv).toContain('"Ahmad ""Rizki"""')
  })
})
