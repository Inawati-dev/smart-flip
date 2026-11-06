import { moduleIdToPath, type ProgressMap } from './progress'
import type { VideoProgressMap } from './videoProgress'
import { formatTanggal } from './jadwal'
import { isBagian, labelNomor } from './jenisTopik'
import type { TopikStatus } from './topik'

// Notifikasi belajar mahasiswa (antrean #353): dihitung dari keadaan belajar, bukan disimpan.
// Hilang sendiri begitu modul selesai dibaca, video ditonton, atau jadwalnya lewat.
//   belum-selesai : modul topik yang terbuka dibaca sebagian (0 < persen < 100)
//   belum-dilihat : modul topik yang terbuka belum pernah dibuka, atau video pertemuan belum ditonton
//   jadwal        : materi atau tes formatif yang dibuka dalam JENDELA_HARI hari ke depan

export type JenisNotifBelajar = 'belum-selesai' | 'belum-dilihat' | 'jadwal'

export interface ButirBelajar {
  kunci: string
  jenis: JenisNotifBelajar
  judul: string
  ket: string
  tautan: string
}

export interface ModulBelajar {
  id: number
  title: string
  jenis?: string | null
  pdf_path?: string | null
  video_url?: string | null
}

/** Jendela jadwal terdekat. */
export const JENDELA_HARI = 7
/** Batas butir per kelompok supaya lonceng tidak membanjir saat banyak topik terbuka sekaligus (Jalur Cepat). */
export const MAKS_MODUL = 3
export const MAKS_VIDEO = 2
export const MAKS_JADWAL = 2

function awalHari(t: Date): number {
  return Date.UTC(t.getFullYear(), t.getMonth(), t.getDate())
}

/** Selisih hari kalender dari `kini` ke `t` (kebal pergeseran jam musim panas). */
export function hariLagi(t: Date, kini: Date): number {
  return Math.round((awalHari(t) - awalHari(kini)) / 86400000)
}

function kataHari(n: number): string {
  return n === 1 ? 'besok' : `${n} hari lagi`
}

export function notifikasiBelajar(opts: {
  /** Topik urut `order_num` (Bagian dan Bab). */
  modulesUrut: ModulBelajar[]
  statusOf: (moduleId: number) => TopikStatus
  progress: ProgressMap
  video: VideoProgressMap
  /** Tanggal materi dibuka bila masih terkunci jadwal, selain itu null (useTopikStatus). */
  bukaPada: (moduleId: number) => Date | null
  formatifPada: (moduleId: number) => Date | null
  kini: Date
}): ButirBelajar[] {
  const { modulesUrut, statusOf, progress, video, bukaPada, formatifPada, kini } = opts
  const sebagian: ButirBelajar[] = []
  const belumBuka: ButirBelajar[] = []
  const belumTonton: ButirBelajar[] = []
  const jadwal: Array<ButirBelajar & { hari: number }> = []

  modulesUrut.forEach((m, i) => {
    const label = labelNomor(modulesUrut, i, false)
    if (statusOf(m.id) === 'open') {
      if (m.pdf_path) {
        const pct = progress[moduleIdToPath(m.id)]?.pct ?? 0
        if (pct > 0 && pct < 100) {
          sebagian.push({ kunci: `selesai-${m.id}`, jenis: 'belum-selesai', judul: `Modul ${label} belum selesai dibaca`, ket: `${m.title} · sudah ${pct}%`, tautan: `/modul/${m.id}` })
        } else if (pct <= 0) {
          belumBuka.push({ kunci: `buka-${m.id}`, jenis: 'belum-dilihat', judul: `Modul ${label} belum dibuka`, ket: m.title, tautan: `/modul/${m.id}` })
        }
      }
      if (!isBagian(m) && m.video_url && !video[m.id]?.done) {
        belumTonton.push({ kunci: `video-${m.id}`, jenis: 'belum-dilihat', judul: `Video ${label} belum ditonton`, ket: m.title, tautan: `/video/${m.id}` })
      }
    }
    const materi = bukaPada(m.id)
    if (materi) {
      const hari = hariLagi(materi, kini)
      if (hari >= 1 && hari <= JENDELA_HARI) {
        jadwal.push({ kunci: `jadwal-materi-${m.id}`, jenis: 'jadwal', judul: `Materi ${label} dibuka ${kataHari(hari)}`, ket: `${m.title} · ${formatTanggal(materi)}`, tautan: '/modul', hari })
      }
    }
    const formatif = !isBagian(m) ? formatifPada(m.id) : null
    if (formatif) {
      const hari = hariLagi(formatif, kini)
      if (hari >= 1 && hari <= JENDELA_HARI) {
        jadwal.push({ kunci: `jadwal-formatif-${m.id}`, jenis: 'jadwal', judul: `Tes formatif ${label} dibuka ${kataHari(hari)}`, ket: `${m.title} · ${formatTanggal(formatif)}`, tautan: `/modul/${m.id}`, hari })
      }
    }
  })

  // Yang sudah dibaca sebagian lebih mendesak daripada yang belum dibuka.
  const modul = [...sebagian, ...belumBuka].slice(0, MAKS_MODUL)
  const dekat: ButirBelajar[] = jadwal
    .sort((a, b) => a.hari - b.hari)
    .slice(0, MAKS_JADWAL)
    .map((b) => ({ kunci: b.kunci, jenis: b.jenis, judul: b.judul, ket: b.ket, tautan: b.tautan }))
  return [...modul, ...belumTonton.slice(0, MAKS_VIDEO), ...dekat]
}
