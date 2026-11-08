import type { AcakSoalResult } from './acak'
import { kirimAttemptKetat, type IsiAttempt } from './quizAttempts'
import { submitGroupAttempt } from './tesKelompok'
import { galatJaringan } from './galatJaringan'

// Pengerjaan tes yang tahan internet putus (antrean #355, 8 Nov 2026).
//   1. Draf: tiap jawaban disalin ke localStorage selama mengerjakan, jadi muat ulang atau
//      internet mati tidak menghapusnya; membuka tes yang sama melanjutkan dari soal terakhir.
//   2. Antrean kirim: bila "Kirim" gagal karena jaringan, hasilnya masuk antrean di perangkat dan
//      dikirim otomatis (PengirimUlang) begitu internet kembali. Dulu hasil yang gagal tersimpan
//      hanya di localStorage dan tidak pernah sampai ke server.

const AWAL_DRAF = 'sfp_tes_draf:'
const KUNCI_ANTREAN = 'sfp_tes_kirim'
/** Draf yang lebih tua dari ini dianggap ditinggalkan. */
export const MASA_DRAF_MS = 48 * 3600 * 1000
export const PERISTIWA_ANTREAN = 'sfp-tes-kirim'

export interface DraftTes {
  acak: AcakSoalResult
  currentQ: number
  jawaban: Record<number, number>
  submitted?: Record<number, boolean>
  ts: number
}

export function kunciDraft(userId: string | undefined, jenis: string, id: string | number): string {
  return `${AWAL_DRAF}${userId ?? 'anon'}:${jenis}:${id}`
}

export function bacaDraft(kunci: string, kini = Date.now()): DraftTes | null {
  try {
    const raw = localStorage.getItem(kunci)
    if (!raw) return null
    const d = JSON.parse(raw) as DraftTes
    if (!d?.acak?.tampil?.length || typeof d.ts !== 'number' || kini - d.ts > MASA_DRAF_MS) {
      localStorage.removeItem(kunci)
      return null
    }
    return d
  } catch {
    return null
  }
}

export function tulisDraft(kunci: string, d: Omit<DraftTes, 'ts'>): void {
  try {
    localStorage.setItem(kunci, JSON.stringify({ ...d, ts: Date.now() }))
  } catch {
    // kuota penuh atau penyimpanan dimatikan: tes tetap jalan, hanya tanpa pemulihan
  }
}

export function hapusDraft(kunci: string): void {
  try {
    localStorage.removeItem(kunci)
  } catch {
    /* sama seperti di atas */
  }
}

// ── Antrean kirim ──

interface Dasar {
  id: string
  userId: string
  ts: number
}
export type ItemKirim =
  | (Dasar & { jenis: 'attempt'; moduleId: number | null; attempt: IsiAttempt })
  | (Dasar & { jenis: 'kelompok'; teamId: string; score: number; answers: unknown })

export function daftarKirim(userId?: string): ItemKirim[] {
  try {
    const semua = JSON.parse(localStorage.getItem(KUNCI_ANTREAN) ?? '[]') as ItemKirim[]
    const list = Array.isArray(semua) ? semua : []
    return userId ? list.filter((i) => i.userId === userId) : list
  } catch {
    return []
  }
}

function tulisAntrean(list: ItemKirim[]): void {
  try {
    if (list.length) localStorage.setItem(KUNCI_ANTREAN, JSON.stringify(list))
    else localStorage.removeItem(KUNCI_ANTREAN)
  } catch {
    /* kuota penuh: item tidak tersimpan, pemanggil sudah menampilkan hasilnya */
  }
  window.dispatchEvent(new Event(PERISTIWA_ANTREAN))
}

type TanpaId =
  | { jenis: 'attempt'; userId: string; moduleId: number | null; attempt: IsiAttempt }
  | { jenis: 'kelompok'; userId: string; teamId: string; score: number; answers: unknown }

function antre(item: TanpaId): void {
  tulisAntrean([...daftarKirim(), { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now() } as ItemKirim])
}

// Galat dari server dengan kode (PostgrestError, mis. 42501 ditolak kebijakan) tidak akan berhasil
// diulang; galat tanpa kode (jaringan putus, sesi belum terbaca) diulang.
function bisaDiulang(e: unknown): boolean {
  if (galatJaringan(e)) return true
  const kode = typeof e === 'object' && e !== null && 'code' in e ? (e as { code: unknown }).code : null
  return !(typeof kode === 'string' && kode !== '')
}

export type HasilKirim = 'terkirim' | 'tunda' | 'gagal'

/** Kirim hasil tes. 'tunda' = masuk antrean di perangkat, dikirim otomatis nanti. 'gagal' = ditolak server. */
export async function kirimAttempt(userId: string | undefined, moduleId: number | null, attempt: IsiAttempt): Promise<HasilKirim> {
  try {
    await kirimAttemptKetat(moduleId, attempt)
    return 'terkirim'
  } catch (e) {
    console.warn('[tesTunda] kirim attempt gagal:', e)
    if (!userId || !bisaDiulang(e)) return 'gagal'
    antre({ jenis: 'attempt', userId, moduleId, attempt: { ...attempt, completedAt: attempt.completedAt ?? new Date().toISOString() } })
    return 'tunda'
  }
}

export async function kirimKelompok(userId: string | undefined, teamId: string, score: number, answers: unknown): Promise<HasilKirim> {
  try {
    await submitGroupAttempt(teamId, score, answers)
    return 'terkirim'
  } catch (e) {
    console.warn('[tesTunda] kirim tes kelompok gagal:', e)
    if (!userId || !galatJaringan(e)) return 'gagal'
    antre({ jenis: 'kelompok', userId, teamId, score, answers })
    return 'tunda'
  }
}

let sedangKirim = false

/** Coba kirim semua item milik `userId`; berhenti di kegagalan pertama supaya tidak menghujani server. */
export async function kirimSemua(userId: string): Promise<{ terkirim: number; sisa: number }> {
  if (sedangKirim) return { terkirim: 0, sisa: daftarKirim(userId).length }
  sedangKirim = true
  let terkirim = 0
  try {
    for (const item of daftarKirim(userId)) {
      try {
        if (item.jenis === 'attempt') await kirimAttemptKetat(item.moduleId, item.attempt)
        else await submitGroupAttempt(item.teamId, item.score, item.answers)
        terkirim++
      } catch (e) {
        if (bisaDiulang(e)) break
        console.warn('[tesTunda] item ditolak server, dibuang dari antrean:', e)
      }
      tulisAntrean(daftarKirim().filter((i) => i.id !== item.id))
    }
  } finally {
    sedangKirim = false
  }
  return { terkirim, sisa: daftarKirim(userId).length }
}
