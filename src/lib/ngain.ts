// Pure N-Gain (Normalized Gain) calculation, ported verbatim from
// legacy/ngain.html's calcNGain()/kategori() — no persistence layer exists
// for this feature in legacy/data-layer.js, so this is a pure client-side
// calculator: enter numbers, see results, nothing saved.

export interface NGainStudent {
  nama: string
  pre: number
  post: number
}

export type NGainCategory = 'tinggi' | 'sedang' | 'rendah'

export interface NGainResult {
  gain: number
  category: NGainCategory
}

/**
 * g = (post - pre) / (max - pre), clamped to [-1, 1].
 * If pre >= max, legacy short-circuits to 0 (avoids divide-by-zero/negative
 * denominator) — ported verbatim from legacy/ngain.html:539-543.
 */
export function computeNGain(pre: number, post: number, max: number): NGainResult {
  let gain: number
  if (pre >= max) {
    gain = 0
  } else {
    const ng = (post - pre) / (max - pre)
    gain = Math.max(-1, Math.min(1, ng))
  }
  return { gain, category: categorizeNGain(gain) }
}

/**
 * Category thresholds ported verbatim from legacy/ngain.html:545-549 (Hake, 1998):
 *   g > 0.7        → Tinggi
 *   0.3 <= g <= 0.7 → Sedang
 *   g < 0.3        → Rendah
 */
export function categorizeNGain(gain: number): NGainCategory {
  if (gain > 0.7) return 'tinggi'
  if (gain >= 0.3) return 'sedang'
  return 'rendah'
}

export interface NGainDistribution {
  average: number
  category: NGainCategory
  tinggi: number
  sedang: number
  rendah: number
  total: number
}

/**
 * Class-wide aggregation, ported from legacy/ngain.html's hitungSemua()/showHasil():
 * average of all gains, then the average itself is re-categorized, plus a
 * per-category headcount for the distribution bar chart.
 */
export function computeNGainDistribution(results: NGainResult[]): NGainDistribution {
  const total = results.length
  const tinggi = results.filter((r) => r.category === 'tinggi').length
  const sedang = results.filter((r) => r.category === 'sedang').length
  const rendah = results.filter((r) => r.category === 'rendah').length
  const average = total ? results.reduce((sum, r) => sum + r.gain, 0) / total : 0
  return { average, category: categorizeNGain(average), tinggi, sedang, rendah, total }
}
