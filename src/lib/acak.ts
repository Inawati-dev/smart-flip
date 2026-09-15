import type { KuisSoal } from './kuisSoal'

// Fisher–Yates murni — dipakai acakSoal di bawah untuk mengacak soal dan opsi.
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export interface AcakUrutSoal {
  question_id: number
  option_order: number[]
}

export interface SoalTampil {
  id: number
  question: string
  options: string[]
  kunciTampil: number | null
}

export interface AcakSoalResult {
  urut: AcakUrutSoal[]
  tampil: SoalTampil[]
}

// Mengacak urutan soal + urutan opsi tiap soal (spec §4.3). `urut` disimpan
// ke quiz_attempts.question_order untuk audit; `tampil` dipakai layar
// pengerjaan. kunciTampil = posisi opsi benar SESUDAH diacak (null untuk
// VARK, answer_idx-nya memang tidak ada).
export function acakSoal(soal: KuisSoal[], rng: () => number = Math.random): AcakSoalResult {
  const soalUrut = shuffle(soal, rng)
  const urut: AcakUrutSoal[] = []
  const tampil: SoalTampil[] = []
  for (const s of soalUrut) {
    const optionOrder = shuffle(s.options.map((_, i) => i), rng)
    urut.push({ question_id: s.id, option_order: optionOrder })
    tampil.push({
      id: s.id,
      question: s.question,
      options: optionOrder.map((i) => s.options[i]),
      kunciTampil: s.answer_idx == null ? null : optionOrder.indexOf(s.answer_idx),
    })
  }
  return { urut, tampil }
}

export interface NilaiResult {
  benar: number
  total: number
  score: number
}

// jawabanIndexTampil[i] = indeks opsi TAMPIL (sudah diacak) yang dipilih
// untuk tampil[i]; null = tidak dijawab.
export function nilai(tampil: SoalTampil[], jawabanIndexTampil: Array<number | null>): NilaiResult {
  const total = tampil.length
  const benar = tampil.filter((s, i) => s.kunciTampil != null && jawabanIndexTampil[i] === s.kunciTampil).length
  return { benar, total, score: total ? Math.round((benar / total) * 100) : 0 }
}
