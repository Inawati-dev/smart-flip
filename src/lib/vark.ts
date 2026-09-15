import { supabase, isSupabaseConfigured } from './supabase'
import { fetchBankSoal } from './kuisSoal'

export interface VarkResult {
  V: number
  A: number
  R: number
  K: number
  dominant: string
  completedAt: string | null
}

const LS_KEY = 'sfp_vark'

function readLocalVark(): VarkResult | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as VarkResult) : null
  } catch {
    return null
  }
}

// Mirrors legacy/data-layer.js getVarkResult(). Note: vark_scores/vark_dominant/
// vark_completed_at are legacy-only columns on `profiles` — they are not present
// in database/schema.sql, so in the current schema this query always errors and
// falls through to the localStorage fallback, same as it does in production today.
export async function fetchVarkResult(): Promise<VarkResult | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('profiles')
          .select('vark_scores, vark_dominant, vark_completed_at')
          .eq('id', uid)
          .single()
        if (error) throw error
        const row = data as unknown as {
          vark_scores: { V: number; A: number; R: number; K: number } | null
          vark_dominant: string | null
          vark_completed_at: string | null
        } | null
        if (row?.vark_scores) {
          return {
            ...row.vark_scores,
            dominant: row.vark_dominant ?? 'V',
            completedAt: row.vark_completed_at,
          }
        }
        return null
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  return readLocalVark()
}

// ══════════════════════════════════════════════════════════════════════════
// WRITE SIDE — ported from legacy/vark.html's finishQuiz()/checkExisting()
// and legacy/data-layer.js's saveVarkResult()/clearVarkResult().
// ══════════════════════════════════════════════════════════════════════════

export const VARK_KEYS = ['V', 'A', 'R', 'K'] as const
export type VarkKey = (typeof VARK_KEYS)[number]

export interface VarkScores {
  V: number
  A: number
  R: number
  K: number
}

export interface VarkComputation {
  scores: VarkScores
  dominant: VarkKey
}

// Pure scoring function — mirrors legacy/vark.html's finishQuiz() exactly:
// each answer is an option index 0..3 for a question, and option index maps
// 1:1 to a VARK dimension via VARK_KEYS (index 0 → V, 1 → A, 2 → R, 3 → K),
// identically across all 12 questions. Tally per-dimension, then walk
// V,A,R,K in order keeping the first strictly-highest score as dominant
// (so ties resolve to whichever of V/A/R/K comes first, same as legacy's
// `if (scores[k] > maxScore)` loop starting from maxScore = -1).
export function computeVarkDominant(answers: Array<number | null>): VarkComputation {
  const scores: VarkScores = { V: 0, A: 0, R: 0, K: 0 }
  answers.forEach((ans) => {
    if (ans !== null && ans >= 0 && ans <= 3) {
      scores[VARK_KEYS[ans]]++
    }
  })

  let dominant: VarkKey = 'V'
  let maxScore = -1
  VARK_KEYS.forEach((k) => {
    if (scores[k] > maxScore) {
      maxScore = scores[k]
      dominant = k
    }
  })

  return { scores, dominant }
}

function writeLocalVark(result: VarkResult): void {
  localStorage.setItem(LS_KEY, JSON.stringify(result))
}

// Mirrors legacy/data-layer.js saveVarkResult(): tries to upsert the legacy
// vark_scores/vark_dominant/vark_completed_at columns onto `profiles` and,
// on success, returns without touching localStorage. Those columns aren't in
// database/schema.sql (see fetchVarkResult's note above), so in the current
// schema the upsert always throws and this always falls through to the
// localStorage write — same behavior as legacy has in production today.
export async function saveVarkResult(result: VarkResult): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('profiles').upsert({
          id: uid,
          vark_scores: { V: result.V, A: result.A, R: result.R, K: result.K },
          vark_dominant: result.dominant,
          vark_completed_at: result.completedAt || new Date().toISOString(),
        })
        if (error) throw error
        return
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  writeLocalVark({ ...result, completedAt: result.completedAt || new Date().toISOString() })
}

// Mirrors legacy/data-layer.js clearVarkResult(): clears the legacy Supabase
// columns (a no-op in the current schema, same reasoning as saveVarkResult
// above) and always removes the localStorage fallback key.
export async function clearVarkResult(): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('profiles').upsert({
          id: uid,
          vark_scores: null,
          vark_dominant: null,
          vark_completed_at: null,
        })
        if (error) throw error
        return
      }
    } catch {
      // fall through to localStorage, matches legacy behavior
    }
  }
  localStorage.removeItem(LS_KEY)
}

// ══════════════════════════════════════════════════════════════════════════
// QUESTIONS — moved verbatim from Vark.tsx's `QUESTIONS` const (WP3, spec §6,
// §9). Still the fallback whenever the bank soal (quiz_questions kind='vark')
// hasn't been migrated yet or is empty — see fetchVarkQuestions below.
// ══════════════════════════════════════════════════════════════════════════
export const VARK_QUESTIONS_DEFAULT: Array<{ text: string; opts: [string, string, string, string] }> = [
  {
    text: 'Ketika mempelajari konsep penelitian baru, saya lebih suka…',
    opts: [
      'Melihat diagram, grafik, atau ilustrasi yang menjelaskan konsep tersebut',
      'Mendengarkan penjelasan dosen atau menonton video podcast',
      'Membaca buku teks, artikel ilmiah, atau catatan kuliah',
      'Langsung mencoba dengan studi kasus atau eksperimen nyata',
    ],
  },
  {
    text: 'Saat perlu mengingat materi kuliah, cara terbaik bagi saya adalah…',
    opts: [
      'Membuat mind map berwarna atau poster visual',
      'Mendiskusikan materi dengan teman atau menjelaskannya secara lisan',
      'Merangkum dalam catatan tertulis atau membuat daftar poin penting',
      'Mempraktikkan langsung atau membuat simulasi dari materi tersebut',
    ],
  },
  {
    text: 'Ketika belajar mandiri di luar kelas, saya biasanya…',
    opts: [
      'Mencari video tutorial atau infografis yang relevan dengan topik',
      'Memutar rekaman kuliah atau berdiskusi lewat voice note dengan teman',
      'Membaca ulang catatan dan merangkum bab per bab secara tertulis',
      'Mengerjakan latihan soal atau membuat proyek kecil terkait materi',
    ],
  },
  {
    text: 'Saat mengerjakan tugas kuliah, langkah pertama yang saya lakukan adalah…',
    opts: [
      'Membuat kerangka visual atau sketsa alur pengerjaan tugas',
      'Mendiskusikan tugas dengan teman untuk mendapat gambaran awal',
      'Membaca instruksi tugas dengan teliti dan mencatat poin-poin utama',
      'Langsung mulai mengerjakan dan belajar dari hasil yang sudah dibuat',
    ],
  },
  {
    text: 'Ketika memahami instruksi dari dosen, saya merasa paling jelas jika…',
    opts: [
      'Instruksi disertai diagram alur, tabel, atau contoh visual',
      'Dosen menjelaskan secara lisan dan saya dapat bertanya langsung',
      'Instruksi diberikan secara tertulis, rinci, dan terstruktur',
      'Ada demonstrasi langkah demi langkah yang bisa saya ikuti',
    ],
  },
  {
    text: 'Ketika memilih media belajar untuk mempersiapkan ujian, saya lebih memilih…',
    opts: [
      'Slide presentasi dengan banyak gambar, bagan, dan warna',
      'Rekaman audio penjelasan materi atau podcast akademik',
      'Buku teks, modul PDF, atau ringkasan teks yang detail',
      'Kuis latihan interaktif atau flashcard yang bisa langsung dicoba',
    ],
  },
  {
    text: 'Saat harus mempresentasikan hasil penelitian, cara saya yang paling nyaman adalah…',
    opts: [
      'Membuat slide visual menarik dengan grafik dan ilustrasi',
      'Berbicara langsung kepada audiens dengan gaya natural dan interaktif',
      'Menyiapkan naskah atau poin presentasi yang tertulis lengkap',
      'Menampilkan demo produk atau simulasi langsung kepada audiens',
    ],
  },
  {
    text: 'Ketika menghadapi kuis atau tes, saya biasanya…',
    opts: [
      'Mengingat kembali diagram, tabel, atau gambar yang pernah saya lihat',
      'Mendengar kembali penjelasan dosen di kepala saya saat menjawab',
      'Membayangkan catatan atau teks yang pernah saya tulis',
      'Mempraktikkan cara penyelesaian masalah seperti yang pernah saya coba',
    ],
  },
  {
    text: 'Ketika mencari sumber referensi untuk penelitian, saya lebih suka…',
    opts: [
      'Mencari jurnal atau artikel yang memiliki banyak gambar, grafik, dan visualisasi data',
      'Mencari rekaman seminar, podcast akademik, atau diskusi panel',
      'Membaca artikel jurnal lengkap dengan teks yang komprehensif',
      'Mencari laporan studi kasus atau hasil penelitian terapan',
    ],
  },
  {
    text: 'Ketika membuat laporan penelitian, bagian yang paling mudah bagi saya adalah…',
    opts: [
      'Membuat visualisasi data seperti grafik, diagram, dan infografis',
      'Menyusun bagian diskusi yang berisi narasi dan argumen lisan',
      'Menulis deskripsi metodologi dan kajian pustaka secara rinci',
      'Mendeskripsikan prosedur praktik dan hasil uji coba lapangan',
    ],
  },
  {
    text: 'Ketika belajar dari kesalahan dalam tugas atau kuis, saya lebih mudah berkembang jika…',
    opts: [
      'Melihat perbandingan jawaban saya vs. jawaban benar dalam format visual',
      'Mendapat penjelasan lisan langsung dari dosen atau teman',
      'Membaca umpan balik tertulis yang menjelaskan letak kesalahan secara rinci',
      'Mencoba mengerjakan ulang soal yang sama atau soal serupa secara langsung',
    ],
  },
  {
    text: 'Dalam mempersiapkan ujian akhir, strategi belajar yang paling efektif bagi saya adalah…',
    opts: [
      'Membuat poster ringkasan, mind map berwarna, atau diagram konsep',
      'Berdiskusi intensif bersama kelompok belajar atau mendengarkan rekaman kuliah',
      'Membaca ulang semua catatan dan modul serta merangkumnya kembali',
      'Mengerjakan sebanyak mungkin soal latihan dan simulasi ujian',
    ],
  },
]

// Reads the VARK bank soal (quiz_questions kind='vark', BankSoal.tsx §WP3)
// and maps it to the shape Vark.tsx renders. Falls back to
// VARK_QUESTIONS_DEFAULT when the bank is empty (pre-v17 deploy, or demo
// mode with nothing seeded) so the assessment never shows a blank quiz.
export async function fetchVarkQuestions(): Promise<Array<{ text: string; opts: [string, string, string, string] }>> {
  const bank = await fetchBankSoal('vark')
  if (bank.length === 0) return VARK_QUESTIONS_DEFAULT
  return bank.map((q) => ({ text: q.question, opts: q.options as [string, string, string, string] }))
}
