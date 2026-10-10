// Rincian benar per topik untuk hasil tes diagnostik (antrean #142 opsi B).
// Tiap soal pre-test boleh ditandai topiknya (quiz_questions.topik_id,
// migration_v31); soal tanpa tanda masuk kelompok `topikId: null`.

export interface RincianTopik {
  topikId: number | null
  benar: number
  total: number
}

interface SoalBank {
  id: number
  answer_idx: number | null
  topik_id?: number | null
}

/** Kelompokkan hasil per topik dari peta "id soal -> benar atau tidak". */
export function rincianDariBenar(soal: SoalBank[], benar: Map<number, boolean>): RincianTopik[] {
  const peta = new Map<number | null, RincianTopik>()
  for (const s of soal) {
    if (!benar.has(s.id)) continue
    const kunci = s.topik_id ?? null
    const r = peta.get(kunci) ?? { topikId: kunci, benar: 0, total: 0 }
    r.total += 1
    if (benar.get(s.id)) r.benar += 1
    peta.set(kunci, r)
  }
  return [...peta.values()]
}

/**
 * Dari percobaan tersimpan: `answers[i]` = posisi opsi yang dipilih pada soal
 * ke-i SESUDAH diacak, `questionOrder[i]` = { question_id, option_order }.
 * Mengembalikan null bila bentuk datanya tidak bisa dibaca (percobaan lama).
 */
export function rincianDariPercobaan(soal: SoalBank[], answers: unknown, questionOrder: unknown): RincianTopik[] | null {
  if (!Array.isArray(answers) || !Array.isArray(questionOrder) || questionOrder.length === 0) return null
  const kunci = new Map(soal.map((s) => [s.id, s.answer_idx]))
  const benar = new Map<number, boolean>()
  questionOrder.forEach((u, i) => {
    const id = (u as { question_id?: unknown } | null)?.question_id
    const urutan = (u as { option_order?: unknown } | null)?.option_order
    if (typeof id !== 'number' || !Array.isArray(urutan) || !kunci.has(id)) return
    const pilih = answers[i]
    benar.set(id, typeof pilih === 'number' && pilih >= 0 && urutan[pilih] === kunci.get(id))
  })
  return benar.size ? rincianDariBenar(soal, benar) : null
}
