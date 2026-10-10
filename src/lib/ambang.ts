import { useCourse } from '../contexts/CourseContext'

// Batas skor per mata kuliah (antrean #136). Dosen mengisinya lewat modal
// "Batas skor" di halaman Asesmen; tersimpan di courses.ambang_diagnostik dan
// courses.ambang_formatif (database/migration_v27_batas_skor.sql). Sebelum
// kolom itu ada, atau untuk mata kuliah yang belum diatur, nilai bawaan di
// bawah yang dipakai. Kolom quiz_attempts.passed (score >= 80, v17) tidak
// lagi dipakai untuk hitungan: lulus atau tidak selalu dibandingkan dengan
// batas mata kuliah yang sekarang, termasuk untuk pengerjaan lama.
export const AMBANG_DIAGNOSTIK = 80
export const AMBANG_FORMATIF = 70

export interface Ambang {
  /** Skor tes diagnostik awal mulai dari sini = Jalur cepat. */
  diagnostik: number
  /** Skor tes formatif mulai dari sini = lulus, topik berikutnya terbuka. */
  formatif: number
}

export function ambangDari(course: { ambang_diagnostik?: number | null; ambang_formatif?: number | null } | null | undefined): Ambang {
  return {
    diagnostik: course?.ambang_diagnostik ?? AMBANG_DIAGNOSTIK,
    formatif: course?.ambang_formatif ?? AMBANG_FORMATIF,
  }
}

/** Batas skor mata kuliah yang sedang dipilih. */
export function useAmbang(): Ambang {
  return ambangDari(useCourse().course)
}
