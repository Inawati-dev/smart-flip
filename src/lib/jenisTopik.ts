// Jenis topik (v54, antrean #321). "Bab" = topik biasa (PDF, video, tes formatif).
// "Bagian" = Pendahuluan dan Penutup: hanya PDF, tanpa video dan tes formatif.
// Bagian tidak memakai nomor Bab (Mini Projek, Aktivitas Mandiri, label "Topik N")
// dan pada jadwal bawaan dibuka bersama bab di sebelahnya. Semua fungsi menerima
// daftar topik yang sudah urut order_num.

type Bertopik = { id: number; jenis?: string | null }

export function isBagian(m: { jenis?: string | null } | null | undefined): boolean {
  return m?.jenis === 'bagian'
}

/** Topik ber-jenis Bab saja, urutannya tetap. */
export function babSaja<T extends Bertopik>(urut: T[]): T[] {
  return urut.filter((m) => !isBagian(m))
}

/** Nomor Bab (1, 2, ...) topik di posisi `i`; null untuk Bagian. */
export function nomorBabDi(urut: Bertopik[], i: number): number | null {
  if (i < 0 || i >= urut.length || isBagian(urut[i])) return null
  return urut.slice(0, i + 1).filter((m) => !isBagian(m)).length
}

/** Nomor Bab untuk topik ber-id `id`; null untuk Bagian atau id yang tidak ada. */
export function nomorBab(urut: Bertopik[], id: number): number | null {
  return nomorBabDi(urut, urut.findIndex((m) => m.id === id))
}

/**
 * Indeks yang dipakai mingguBawaan untuk topik di posisi `i`: urutan bab (0 = Bab 1).
 * Bagian ikut bab di sebelahnya: Bagian sebelum bab pertama ikut Bab 1, sisanya ikut
 * bab sebelumnya. Tanpa satu pun bab, indeks posisi dipakai apa adanya.
 */
export function indeksJadwal(urut: Bertopik[], i: number): number {
  const jumlahBab = babSaja(urut).length
  if (!jumlahBab) return Math.max(0, i)
  const sebelum = urut.slice(0, Math.max(0, i)).filter((m) => !isBagian(m)).length
  if (!isBagian(urut[i])) return sebelum
  return Math.max(0, sebelum - 1)
}

/** Label nomor kartu: "Topik 01" untuk Bab, "Bagian I" (sebelum bab pertama) atau "Bagian III" (sesudahnya) untuk Bagian. */
export function labelNomor(urut: Bertopik[], i: number, pad = true): string {
  const n = nomorBabDi(urut, i)
  if (n != null) return `Topik ${pad ? String(n).padStart(2, '0') : n}`
  const sebelumBab = urut.slice(0, i).every((m) => isBagian(m))
  return sebelumBab ? 'Bagian I' : 'Bagian III'
}
