import { supabase, isSupabaseConfigured } from './supabase'

// Diagnostic placement test — see
// docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md.
// One-time, pre-Bab-1, sets profile.jalur ('cepat' | 'mendalam') for the
// whole course. Separate from quiz_questions (which is per-module) since
// this test isn't tied to any single module.

export interface DiagnosticQuestion {
  id: number
  pertanyaan: string
  opsi: string[]
  jawaban: number
  order_num: number
}

const DEMO_QUESTIONS_KEY = 'sfp_diagnostic_questions_demo'
const JALUR_KEY = 'sfp_jalur_demo'

// Demo/localStorage mode has no diagnostic_questions table to read from —
// ship the same 15-question starter bank the migration seeds, so the demo
// experience matches Supabase mode instead of showing an empty test.
const FALLBACK_QUESTIONS: DiagnosticQuestion[] = [
  { id: 1, pertanyaan: 'Apa tujuan utama penelitian R&D (Research & Development) dalam pendidikan?', opsi: ['Mendeskripsikan fenomena secara alamiah', 'Menguji hipotesis dengan statistik inferensial', 'Menghasilkan produk dan menguji efektivitasnya', 'Menganalisis dokumen kurikulum'], jawaban: 2, order_num: 1 },
  { id: 2, pertanyaan: 'Ciri utama yang membedakan R&D dari jenis penelitian lain adalah...', opsi: ['Sampel acak besar', 'Menghasilkan produk yang divalidasi dan diujicobakan', 'Fokus menguji teori baru', 'Selalu kualitatif'], jawaban: 1, order_num: 2 },
  { id: 3, pertanyaan: 'ADDIE adalah singkatan dari...', opsi: ['Analyze, Design, Develop, Implement, Evaluate', 'Assess, Design, Deliver, Instruct, Evaluate', 'Analyze, Develop, Design, Implement, Extend', 'Assess, Develop, Deliver, Implement, Evaluate'], jawaban: 0, order_num: 3 },
  { id: 4, pertanyaan: 'Tahap ADDIE yang fokus pada analisis kebutuhan dan kesenjangan adalah...', opsi: ['Design', 'Analyze', 'Develop', 'Evaluate'], jawaban: 1, order_num: 4 },
  { id: 5, pertanyaan: 'Needs assessment dalam pengembangan produk pendidikan dilakukan untuk...', opsi: ['Menentukan harga produk', 'Mengidentifikasi kesenjangan antara kondisi ideal dan aktual', 'Menulis laporan akhir', 'Memilih dosen pembimbing'], jawaban: 1, order_num: 5 },
  { id: 6, pertanyaan: 'Bagian yang wajib ada di Bab Pendahuluan proposal R&D adalah...', opsi: ['Daftar riwayat hidup peneliti', 'Latar belakang, rumusan masalah, dan tujuan pengembangan', 'Anggaran biaya penelitian', 'Jadwal wisuda'], jawaban: 1, order_num: 6 },
  { id: 7, pertanyaan: 'Fungsi storyboard dalam pengembangan produk digital adalah...', opsi: ['Mencatat anggaran produksi', 'Menggambarkan alur dan tampilan produk sebelum dibangun', 'Mengganti laporan akhir', 'Mengukur kepuasan pengguna'], jawaban: 1, order_num: 7 },
  { id: 8, pertanyaan: 'Instrumen validasi ahli digunakan untuk mengukur...', opsi: ['Kelayakan produk dari sisi materi dan media sebelum uji coba', 'Nilai ujian akhir mahasiswa', 'Kehadiran mahasiswa', 'Anggaran proyek'], jawaban: 0, order_num: 8 },
  { id: 9, pertanyaan: 'Skala yang umum dipakai pada lembar validasi ahli adalah...', opsi: ['Skala Likert', 'Skala Celsius', 'Skala Richter', 'Skala Ordinal biner saja'], jawaban: 0, order_num: 9 },
  { id: 10, pertanyaan: 'Teknik analisis yang umum dipakai untuk data validasi ahli kuantitatif adalah...', opsi: ['Analisis regresi berganda', 'Rata-rata skor dan kategori kelayakan', 'Analisis jalur (path analysis)', 'Uji ANOVA dua arah'], jawaban: 1, order_num: 10 },
  { id: 11, pertanyaan: 'Tujuan utama uji coba terbatas sebelum peluncuran penuh sebuah produk adalah...', opsi: ['Mempercepat kelulusan mahasiswa', 'Menemukan masalah dan mengumpulkan masukan sebelum skala penuh', 'Menghemat biaya cetak', 'Mengganti validasi ahli'], jawaban: 1, order_num: 11 },
  { id: 12, pertanyaan: 'Diseminasi hasil penelitian R&D umumnya dilakukan melalui...', opsi: ['Menyimpan laporan di rak pribadi', 'Publikasi artikel ilmiah dan forum akademik', 'Menghapus data setelah selesai', 'Tidak perlu didiseminasikan'], jawaban: 1, order_num: 12 },
  { id: 13, pertanyaan: 'Perbedaan utama penelitian kuantitatif dan kualitatif dari sisi data adalah...', opsi: ['Kuantitatif pakai angka/statistik, kualitatif pakai deskripsi mendalam', 'Kuantitatif selalu lebih valid', 'Kualitatif tidak butuh data', 'Tidak ada perbedaan'], jawaban: 0, order_num: 13 },
  { id: 14, pertanyaan: 'Studi pustaka penting dilakukan sebelum menyusun instrumen penelitian karena...', opsi: ['Supaya laporan lebih tebal', 'Memberi landasan teori dan menghindari duplikasi penelitian', 'Wajib menurut kampus tanpa alasan akademik', 'Mempercepat pengumpulan data'], jawaban: 1, order_num: 14 },
  { id: 15, pertanyaan: 'Yang dimaksud "produk" dalam konteks penelitian R&D pendidikan adalah...', opsi: ['Hanya barang fisik seperti alat peraga', 'Bisa berupa modul, media, model, atau perangkat pembelajaran apa pun yang diuji efektivitasnya', 'Selalu berupa aplikasi digital', 'Laporan penelitian itu sendiri'], jawaban: 1, order_num: 15 },
]

export async function fetchDiagnosticQuestions(): Promise<DiagnosticQuestion[]> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase
        .from('diagnostic_questions')
        .select('id, pertanyaan, opsi, jawaban, order_num')
        .order('order_num')
      if (error) throw error
      if (data && data.length) return data as DiagnosticQuestion[]
    } catch (e) {
      console.warn('[diagnostic] fetchDiagnosticQuestions → Supabase gagal, fallback demo bank:', e)
    }
  }
  try {
    const raw = localStorage.getItem(DEMO_QUESTIONS_KEY)
    if (raw) return JSON.parse(raw) as DiagnosticQuestion[]
  } catch {
    // ignore, fall through to the bundled starter bank
  }
  return FALLBACK_QUESTIONS
}

// Shared demo/localStorage read+write helpers for the CRUD functions below —
// reuses DEMO_QUESTIONS_KEY (already read by fetchDiagnosticQuestions as a
// fallback) since demo mode has no real diagnostic_questions table to write
// against.
function demoReadAll(): DiagnosticQuestion[] {
  try {
    const raw = localStorage.getItem(DEMO_QUESTIONS_KEY)
    if (raw) return JSON.parse(raw) as DiagnosticQuestion[]
  } catch {
    // ignore, fall through to the bundled starter bank
  }
  return FALLBACK_QUESTIONS.slice()
}

function demoWriteAll(questions: DiagnosticQuestion[]): void {
  try {
    localStorage.setItem(DEMO_QUESTIONS_KEY, JSON.stringify(questions))
  } catch {
    // ignore quota/serialization errors, matches lib/manajemen.ts lsSet behavior
  }
}

// Dosen-only CRUD for /manajemen — see
// docs/superpowers/specs/2026-07-23-diagnostic-adaptive-roadmap-design.md's
// "Admin edit (dosen)" section. Same dual-mode (Supabase when configured,
// else localStorage) fallback as the rest of this file/src/lib/manajemen.ts;
// demo mode has no real table backing it, so it manages a local array under
// DEMO_QUESTIONS_KEY instead.
export async function createDiagnosticQuestion(data: Omit<DiagnosticQuestion, 'id'>): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('diagnostic_questions').insert(data)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[diagnostic] createDiagnosticQuestion → Supabase gagal, fallback localStorage:', e)
    }
  }
  const all = demoReadAll()
  const nextId = all.reduce((max, q) => Math.max(max, q.id), 0) + 1
  demoWriteAll([...all, { ...data, id: nextId }])
}

export async function updateDiagnosticQuestion(
  id: number,
  data: Partial<Omit<DiagnosticQuestion, 'id'>>,
): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('diagnostic_questions').update(data).eq('id', id)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[diagnostic] updateDiagnosticQuestion → Supabase gagal, fallback localStorage:', e)
    }
  }
  const all = demoReadAll()
  demoWriteAll(all.map((q) => (q.id === id ? { ...q, ...data } : q)))
}

export async function deleteDiagnosticQuestion(id: number): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabase.from('diagnostic_questions').delete().eq('id', id)
      if (error) throw error
      return
    } catch (e) {
      console.warn('[diagnostic] deleteDiagnosticQuestion → Supabase gagal, fallback localStorage:', e)
    }
  }
  const all = demoReadAll()
  demoWriteAll(all.filter((q) => q.id !== id))
}

export type Jalur = 'cepat' | 'mendalam'

// Pure — score is 0-100 (percent correct), jalur derived per the spec:
// > 80 → cepat, <= 80 → mendalam.
export function computeJalur(
  questions: DiagnosticQuestion[],
  answers: Array<number | null>,
): { score: number; jalur: Jalur } {
  const correct = questions.reduce(
    (sum, q, i) => sum + (answers[i] === q.jawaban ? 1 : 0),
    0,
  )
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0
  return { score, jalur: score > 80 ? 'cepat' : 'mendalam' }
}

// Persists the computed jalur to profile.jalur (Supabase) or a local demo
// key — mirrors the dual-mode pattern used throughout src/lib/*.ts.
export async function saveJalur(jalur: Jalur): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { error } = await supabase.from('profiles').update({ jalur }).eq('id', uid)
        if (error) throw error
        return
      }
    } catch (e) {
      console.warn('[diagnostic] saveJalur → Supabase gagal, fallback localStorage:', e)
    }
  }
  localStorage.setItem(JALUR_KEY, jalur)
}

// Demo-mode-only read, used by the AuthContext-free demo path — real mode
// reads jalur straight off `profile.jalur` via AuthContext instead.
export function readDemoJalur(): Jalur | null {
  const v = localStorage.getItem(JALUR_KEY)
  return v === 'cepat' || v === 'mendalam' ? (v as Jalur) : null
}
