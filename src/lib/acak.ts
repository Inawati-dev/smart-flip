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
// Tes diagnostik awal menampilkan 20 soal dari bank (antrean #241, keputusan Johan 18 Okt 2026: bank 60, 10 per bab).
export const SOAL_TAMPIL_DIAGNOSTIK = 20

// Ambil `n` soal acak yang seimbang per topik (topik_id; soal tanpa topik satu kelompok): giliran antar-topik yang
// urutannya diacak, sehingga 20 dari 6 topik menjadi 3-4 per topik. Bank lebih kecil dari `n` dikembalikan semua.
export function ambilSeimbang(soal: KuisSoal[], n: number, rng: () => number = Math.random): KuisSoal[] {
  if (soal.length <= n) return soal
  const kelompok = new Map<string, KuisSoal[]>()
  for (const s of shuffle(soal, rng)) {
    const k = String(s.topik_id ?? '-')
    kelompok.set(k, [...(kelompok.get(k) ?? []), s])
  }
  const antre = shuffle([...kelompok.values()], rng)
  const hasil: KuisSoal[] = []
  while (hasil.length < n) {
    for (const g of antre) {
      const s = g.shift()
      if (s && hasil.length < n) hasil.push(s)
    }
  }
  return hasil
}

// Tes formatif menampilkan sebagian bank (antrean #235, keputusan Johan 18 Okt 2026: bank 20, tampil 10)
// supaya soal, urutan, dan opsinya berganti tiap pengerjaan.
export const SOAL_TAMPIL_FORMATIF = 10

// `maks` = ambil sebanyak itu dari bank yang sudah diacak; tanpa `maks` semua soal tampil.
export function acakSoal(soal: KuisSoal[], rng: () => number = Math.random, maks?: number): AcakSoalResult {
  const soalUrut = maks == null ? shuffle(soal, rng) : shuffle(soal, rng).slice(0, maks)
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
