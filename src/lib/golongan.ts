import { PASS_SCORE } from './quizAttempts'
import { isSupabaseConfigured } from './supabase'

// Golongan hasil pre-test (antrean #105 opsi B, keputusan Johan 26 Sep 2026:
// batas 80). Mahir membuka semua topik sekaligus; Remedial membuka topik satu
// per satu seperti sebelumnya. Formatif >= 80 tetap syarat topik selesai untuk
// keduanya. Tanpa skor pre-test (bank pre-test kosong, dilewati) = Belum
// dipetakan, jalurnya sama dengan Remedial.
export type Golongan = 'mahir' | 'remedial' | 'belum'

export const AMBANG_MAHIR = PASS_SCORE

export function golonganDariSkor(skor: number | null | undefined, ambang: number = AMBANG_MAHIR): Golongan {
  if (skor == null) return 'belum'
  return skor >= ambang ? 'mahir' : 'remedial'
}

export const GOLONGAN_LABEL: Record<Golongan, string> = {
  mahir: 'Mahir',
  remedial: 'Remedial',
  belum: 'Belum dipetakan',
}

/** Jenis chip `ChipRak` per golongan. */
export const GOLONGAN_CHIP: Record<Golongan, 'ok' | 'warn' | 'todo'> = {
  mahir: 'ok',
  remedial: 'warn',
  belum: 'todo',
}

export const GOLONGAN_KETERANGAN: Record<Golongan, string> = {
  mahir: `Semua topik sudah terbuka. Tes formatif tiap topik tetap perlu skor ${AMBANG_MAHIR} supaya topik dihitung selesai.`,
  remedial: `Topik dibuka satu per satu. Topik berikutnya terbuka setelah tes formatif topik sebelumnya dapat skor ${AMBANG_MAHIR}.`,
  belum: 'Belum ada skor pre-test, jadi topik dibuka satu per satu.',
}

// Mode demo (tanpa Supabase) tidak bisa membaca quiz_attempts, jadi skor
// pre-test disimpan lokal per mata kuliah supaya golongannya bisa dicoba.
// Hanya mode demo: di produksi kunci ini tidak membedakan pengguna, jadi di
// perangkat bersama skor mahasiswa lain bisa terbaca (temuan pemeriksa #105).
const kunciDemo = (courseId: number) => `sfp_pretest_skor_${courseId}`

export function simpanSkorPreDemo(courseId: number, skor: number): void {
  if (isSupabaseConfigured) return
  try {
    localStorage.setItem(kunciDemo(courseId), String(skor))
  } catch {
    // abaikan kuota/mode privat
  }
}

export function bacaSkorPreDemo(courseId: number): number | null {
  if (isSupabaseConfigured) return null
  try {
    const v = localStorage.getItem(kunciDemo(courseId))
    return v == null ? null : Number(v)
  } catch {
    return null
  }
}
