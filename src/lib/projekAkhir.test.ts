// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  BAGIAN_PROPOSAL,
  MIN_ISI_BAGIAN,
  STATUS_BADGE,
  STATUS_DOSEN,
  STATUS_LABEL,
  ajukanProjek,
  bagianTerisi,
  fetchProjekKelas,
  fetchProjekSaya,
  formatUkuran,
  hitungKelengkapan,
  namaObjekProjek,
  nilaiProjek,
  perluSignedUrl,
  projekKosong,
  rekapStatus,
  simpanProjek,
  validasiPengajuan,
  type ProjekAkhir,
} from './projekAkhir'

// isSupabaseConfigured bernilai false di lingkungan tes (VITE_SUPABASE_* tidak
// diset), jadi semua pemanggilan persistensi di bawah menempuh jalur
// localStorage — sama seperti preseden di draf.test.ts / validasi.test.ts.

const LS_KEY = 'sfp_projek_akhir'

const ISI_PANJANG = 'Pengembangan modul ajar berbasis proyek untuk mahasiswa vokasi.'

function projekLengkap(over: Partial<ProjekAkhir> = {}): ProjekAkhir {
  return {
    ...projekKosong('u1', 'Budi'),
    judul: 'Pengembangan E-Modul R&D',
    ringkasan: ISI_PANJANG,
    latarBelakang: ISI_PANJANG,
    rumusanMasalah: ISI_PANJANG,
    tujuan: ISI_PANJANG,
    metode: ISI_PANJANG,
    ...over,
  }
}

beforeEach(() => {
  localStorage.clear()
})

describe('konstanta bagian & status', () => {
  it('punya lima bagian proposal dengan key unik', () => {
    expect(BAGIAN_PROPOSAL).toHaveLength(5)
    expect(new Set(BAGIAN_PROPOSAL.map((b) => b.key)).size).toBe(5)
  })

  it('setiap bagian punya label dan petunjuk yang terisi', () => {
    for (const b of BAGIAN_PROPOSAL) {
      expect(b.label.length).toBeGreaterThan(0)
      expect(b.petunjuk.length).toBeGreaterThan(0)
    }
  })

  it('setiap status punya label dan warna badge', () => {
    for (const s of ['draf', 'diajukan', 'revisi', 'disetujui'] as const) {
      expect(STATUS_LABEL[s]).toBeTruthy()
      expect(STATUS_BADGE[s].bg).toMatch(/^#/)
      expect(STATUS_BADGE[s].color).toMatch(/^#/)
    }
  })

  it('dosen tidak boleh mengembalikan proposal ke status draf', () => {
    // 'draf' murni milik mahasiswa (belum diajukan) — kalau muncul di dropdown
    // dosen, trigger database akan menolaknya diam-diam dan UI-nya berbohong.
    expect(STATUS_DOSEN).not.toContain('draf')
    expect(STATUS_DOSEN).toEqual(['diajukan', 'revisi', 'disetujui'])
  })
})

describe('bagianTerisi', () => {
  it('menganggap isian di bawah ambang sebagai belum terisi', () => {
    const p = projekKosong()
    p.ringkasan = 'a'.repeat(MIN_ISI_BAGIAN - 1)
    expect(bagianTerisi(p, 'ringkasan')).toBe(false)
  })

  it('menganggap isian tepat di ambang sebagai terisi', () => {
    const p = projekKosong()
    p.ringkasan = 'a'.repeat(MIN_ISI_BAGIAN)
    expect(bagianTerisi(p, 'ringkasan')).toBe(true)
  })

  it('mengabaikan spasi di ujung', () => {
    const p = projekKosong()
    p.tujuan = '   ' + 'a'.repeat(MIN_ISI_BAGIAN - 2) + '   '
    expect(bagianTerisi(p, 'tujuan')).toBe(false)
  })
})

describe('hitungKelengkapan', () => {
  it('bernilai 0 untuk proposal kosong', () => {
    expect(hitungKelengkapan(projekKosong())).toBe(0)
  })

  it('bernilai 100 saat judul, lima bagian, dan berkas lengkap', () => {
    expect(hitungKelengkapan(projekLengkap({ filePath: 'u1/berkas.pdf' }))).toBe(100)
  })

  it('tidak pernah 100 kalau hanya lewat tulisan tanpa berkas', () => {
    // Berkas ikut dihitung satu butir, jadi jalur "tulis saja" mentok di 6/7.
    expect(hitungKelengkapan(projekLengkap())).toBe(86)
  })

  it('berkas saja tetap menaikkan angka dari nol', () => {
    const p = projekKosong()
    p.filePath = 'u1/proposal.pdf'
    expect(hitungKelengkapan(p)).toBeGreaterThan(0)
  })
})

describe('validasiPengajuan', () => {
  it('menolak proposal tanpa judul', () => {
    expect(validasiPengajuan(projekKosong())).toMatch(/judul/i)
  })

  it('menolak proposal berjudul tapi tanpa berkas maupun tulisan', () => {
    const p = projekKosong()
    p.judul = 'Judul saja'
    expect(validasiPengajuan(p)).toMatch(/unggah berkas/i)
  })

  it('meloloskan proposal yang hanya diunggah berkasnya', () => {
    const p = projekKosong()
    p.judul = 'Judul'
    p.filePath = 'u1/proposal.pdf'
    expect(validasiPengajuan(p)).toBeNull()
  })

  it('meloloskan proposal yang hanya ditulis di sistem', () => {
    const p = projekKosong()
    p.judul = 'Judul'
    p.latarBelakang = ISI_PANJANG
    expect(validasiPengajuan(p)).toBeNull()
  })
})

describe('rekapStatus', () => {
  it('menghitung nol untuk daftar kosong', () => {
    expect(rekapStatus([])).toEqual({ total: 0, draf: 0, diajukan: 0, revisi: 0, disetujui: 0 })
  })

  it('mencacah tiap status', () => {
    const list = [
      projekLengkap({ id: '1', status: 'draf' }),
      projekLengkap({ id: '2', status: 'diajukan' }),
      projekLengkap({ id: '3', status: 'diajukan' }),
      projekLengkap({ id: '4', status: 'disetujui' }),
    ]
    expect(rekapStatus(list)).toEqual({ total: 4, draf: 1, diajukan: 2, revisi: 0, disetujui: 1 })
  })
})

describe('namaObjekProjek', () => {
  it('menaruh berkas di folder milik user (dipakai policy Storage v15)', () => {
    expect(namaObjekProjek('abc-123', 'proposal.pdf').startsWith('abc-123/')).toBe(true)
  })

  it('membersihkan spasi dan karakter aneh dari nama berkas', () => {
    const nama = namaObjekProjek('u1', 'Proposal Akhir (revisi 2).pdf')
    expect(nama).not.toMatch(/[ ()]/)
    expect(nama.endsWith('.pdf')).toBe(true)
  })

  it('menghasilkan nama berbeda untuk unggahan berulang', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const a = namaObjekProjek('u1', 'x.pdf')
    vi.setSystemTime(new Date('2026-01-01T00:00:01Z'))
    const b = namaObjekProjek('u1', 'x.pdf')
    vi.useRealTimers()
    expect(a).not.toBe(b)
  })
})

describe('perluSignedUrl', () => {
  it('true untuk path objek Storage', () => {
    expect(perluSignedUrl('u1/1720000000-proposal.pdf')).toBe(true)
  })

  it('false untuk blob URL mode demo dan tautan http', () => {
    expect(perluSignedUrl('blob:http://localhost/abc')).toBe(false)
    expect(perluSignedUrl('https://contoh.test/a.pdf')).toBe(false)
  })

  it('false untuk nilai kosong', () => {
    expect(perluSignedUrl(null)).toBe(false)
    expect(perluSignedUrl('')).toBe(false)
  })
})

describe('formatUkuran', () => {
  it('memformat byte, KB, dan MB', () => {
    expect(formatUkuran(512)).toBe('512 B')
    expect(formatUkuran(2048)).toBe('2 KB')
    expect(formatUkuran(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('tidak meledak untuk masukan tak masuk akal', () => {
    expect(formatUkuran(Number.NaN)).toBe('—')
    expect(formatUkuran(-1)).toBe('—')
  })
})

describe('simpanProjek & fetchProjekSaya (fallback localStorage)', () => {
  it('mengembalikan null saat belum ada apa-apa', async () => {
    expect(await fetchProjekSaya()).toBeNull()
  })

  it('menyimpan lalu membaca balik isi proposal', async () => {
    await simpanProjek(
      {
        judul: 'Pengembangan LKPD Digital',
        ringkasan: ISI_PANJANG,
        latarBelakang: '',
        rumusanMasalah: '',
        tujuan: '',
        metode: '',
      },
      'Budi',
    )
    const tersimpan = await fetchProjekSaya()
    expect(tersimpan?.judul).toBe('Pengembangan LKPD Digital')
    expect(tersimpan?.ringkasan).toBe(ISI_PANJANG)
    expect(tersimpan?.status).toBe('draf')
    expect(JSON.parse(localStorage.getItem(LS_KEY)!).judul).toBe('Pengembangan LKPD Digital')
  })

  it('membedakan "jangan sentuh berkas" (undefined) dari "kosongkan" (null)', async () => {
    const dasar = {
      judul: 'J',
      ringkasan: '',
      latarBelakang: '',
      rumusanMasalah: '',
      tujuan: '',
      metode: '',
    }
    await simpanProjek({ ...dasar, filePath: 'u1/a.pdf', fileName: 'a.pdf' })
    await simpanProjek({ ...dasar, judul: 'J2' }) // tanpa field berkas sama sekali
    expect((await fetchProjekSaya())?.filePath).toBe('u1/a.pdf')

    await simpanProjek({ ...dasar, filePath: null, fileName: null })
    expect((await fetchProjekSaya())?.filePath).toBeNull()
  })
})

describe('ajukanProjek & nilaiProjek (fallback localStorage)', () => {
  const dasar = {
    judul: 'J',
    ringkasan: ISI_PANJANG,
    latarBelakang: '',
    rumusanMasalah: '',
    tujuan: '',
    metode: '',
  }

  it('pengajuan mengubah status dan mencatat waktunya', async () => {
    const p = await simpanProjek(dasar)
    await ajukanProjek(p.id)
    const setelah = await fetchProjekSaya()
    expect(setelah?.status).toBe('diajukan')
    expect(setelah?.submittedAt).toBeTruthy()
  })

  it('penilaian dosen menyimpan status dan catatan', async () => {
    const p = await simpanProjek(dasar)
    await nilaiProjek(p.id, 'revisi', 'Perjelas rumusan masalahnya.')
    const setelah = await fetchProjekSaya()
    expect(setelah?.status).toBe('revisi')
    expect(setelah?.catatanDosen).toBe('Perjelas rumusan masalahnya.')
  })

  it('tidak melempar saat belum ada proposal tersimpan', async () => {
    await expect(ajukanProjek('tidak-ada')).resolves.toBeUndefined()
    await expect(nilaiProjek('tidak-ada', 'disetujui', '')).resolves.toBeUndefined()
  })
})

describe('fetchProjekKelas (fallback localStorage)', () => {
  it('mengembalikan array kosong saat belum ada data', async () => {
    expect(await fetchProjekKelas()).toEqual([])
  })

  it('mode demo memunculkan satu proposal simulasi supaya tampilan dosen bisa dijelajahi', async () => {
    await simpanProjek(
      { judul: 'J', ringkasan: '', latarBelakang: '', rumusanMasalah: '', tujuan: '', metode: '' },
      'Budi',
    )
    const daftar = await fetchProjekKelas()
    expect(daftar).toHaveLength(1)
    expect(daftar[0].nama).toBe('Budi')
  })
})

describe('penanganan localStorage yang gagal', () => {
  it('fetchProjekSaya mengembalikan null saat getItem melempar', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await fetchProjekSaya()).toBeNull()
    spy.mockRestore()
  })

  it('simpanProjek tidak melempar saat setItem gagal (kuota penuh)', async () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await expect(
      simpanProjek({ judul: 'J', ringkasan: '', latarBelakang: '', rumusanMasalah: '', tujuan: '', metode: '' }),
    ).resolves.toBeTruthy()
    spy.mockRestore()
  })
})
