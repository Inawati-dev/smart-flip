import { supabase, isSupabaseConfigured } from './supabase'

// Aktivitas Mandiri (Observasi Lapangan) — poin 2 & 3 konsep Asesmen: dosen
// menulis tugas observasi, mahasiswa mengumpulkan hasilnya lewat UNGGAHAN
// BERKAS atau TULISAN LANGSUNG di sistem, dosen memantau progresnya.
// Tabel: `observasi_tugas` + `observasi_submissions`, lihat
// database/migration_v14_observasi.sql (BELUM dijalankan di produksi).
//
// Cakupan baris sepenuhnya diserahkan ke RLS (is_dosen_of / is_my_dosen),
// sama seperti lib/asesmen.ts — tidak ada filter dosen_id manual di sini,
// select polos sudah otomatis ter-scope per kelas yang dosen ini pegang.

export type ObservasiStatus = 'submitted' | 'reviewed' | 'revision'

export interface ObservasiTugas {
  id: number
  judul: string
  deskripsi: string
  moduleId: number | null
  /** Judul modul terkait, null kalau tugasnya berdiri sendiri (lintas modul). */
  modulJudul: string | null
  deadline: string | null
  orderNum: number
  createdBy: string
  createdAt: string
}

export interface ObservasiSubmission {
  id: number
  tugasId: number
  userId: string
  nama: string
  kelas: string | null
  /** Jalur "tulis langsung di sistem" — string kosong kalau tidak dipakai. */
  isiTeks: string
  /** Jalur "unggah berkas" — null kalau tidak dipakai. */
  fileUrl: string | null
  fileName: string | null
  status: ObservasiStatus
  catatanDosen: string | null
  submittedAt: string
  updatedAt: string
}

export interface ObservasiMahasiswa {
  id: string
  nama: string
  kelas: string | null
}

// ── Label & badge — mengikuti kosakata status draf (lib/draf.ts) supaya
// dosen tidak perlu menghafal dua set istilah untuk dua fitur yang alurnya
// mirip (kumpul → periksa → minta revisi). ──

export const OBSERVASI_STATUS_LABEL: Record<ObservasiStatus, string> = {
  submitted: 'Menunggu Review',
  reviewed: 'Sudah Direview',
  revision: 'Perlu Revisi',
}

export const OBSERVASI_STATUS_BADGE: Record<ObservasiStatus, { bg: string; color: string }> = {
  submitted: { bg: '#FAE8A0', color: '#705010' },
  reviewed: { bg: '#C0DD97', color: '#27500A' },
  revision: { bg: '#FDDAD9', color: '#B03020' },
}

// ════════════════════════════════════════════
//  Helper murni — dipisah dari I/O supaya bisa diuji tanpa Supabase
//  (pola yang sama dengan lib/analitik.ts & lib/ngain.ts)
// ════════════════════════════════════════════

/** Jalur pengumpulan yang benar-benar dipakai mahasiswa pada satu jawaban. */
export type ObservasiJalur = 'teks' | 'berkas' | 'keduanya' | 'kosong'

export function jalurPengumpulan(s: Pick<ObservasiSubmission, 'isiTeks' | 'fileUrl'>): ObservasiJalur {
  const adaTeks = s.isiTeks.trim() !== ''
  const adaBerkas = !!s.fileUrl
  if (adaTeks && adaBerkas) return 'keduanya'
  if (adaTeks) return 'teks'
  if (adaBerkas) return 'berkas'
  return 'kosong'
}

/**
 * Terlambat = dikumpulkan setelah deadline. Tugas tanpa deadline tidak pernah
 * terlambat — sengaja, karena deadline memang opsional di tabelnya.
 */
export function isTerlambat(deadline: string | null, submittedAt: string): boolean {
  if (!deadline) return false
  const batas = new Date(deadline).getTime()
  const kumpul = new Date(submittedAt).getTime()
  if (Number.isNaN(batas) || Number.isNaN(kumpul)) return false
  return kumpul > batas
}

export interface TugasProgress {
  tugasId: number
  judul: string
  deadline: string | null
  totalMahasiswa: number
  sudah: number
  belum: number
  persen: number
  menunggu: number
  diperiksa: number
  perluRevisi: number
  terlambat: number
}

/**
 * Rekap per TUGAS: berapa mahasiswa yang sudah/belum mengumpulkan.
 *
 * Pembaginya adalah jumlah mahasiswa yang terlihat oleh dosen ini (sudah
 * ter-scope RLS ke kelas miliknya), bukan jumlah jawaban yang masuk — kalau
 * dibalik, tugas yang belum disentuh siapa pun akan tampil "100% selesai".
 * Jawaban dari mahasiswa di luar daftar (mis. pindah kelas setelah
 * mengumpulkan) tetap dihitung di rincian status, tapi `sudah` di-clamp ke
 * `totalMahasiswa` supaya persentasenya tidak pernah lewat 100.
 */
export function computeTugasProgress(
  tugasList: ObservasiTugas[],
  students: ObservasiMahasiswa[],
  submissions: ObservasiSubmission[],
): TugasProgress[] {
  const total = students.length
  return tugasList.map((t) => {
    const jawaban = submissions.filter((s) => s.tugasId === t.id)
    const sudah = Math.min(jawaban.length, total)
    return {
      tugasId: t.id,
      judul: t.judul,
      deadline: t.deadline,
      totalMahasiswa: total,
      sudah,
      belum: Math.max(total - sudah, 0),
      persen: total ? Math.round((sudah / total) * 100) : 0,
      menunggu: jawaban.filter((s) => s.status === 'submitted').length,
      diperiksa: jawaban.filter((s) => s.status === 'reviewed').length,
      perluRevisi: jawaban.filter((s) => s.status === 'revision').length,
      terlambat: jawaban.filter((s) => isTerlambat(t.deadline, s.submittedAt)).length,
    }
  })
}

export interface MahasiswaProgress {
  userId: string
  nama: string
  kelas: string | null
  sudah: number
  totalTugas: number
  persen: number
  perluRevisi: number
  /** Judul tugas yang belum dikumpulkan — dipakai buat kolom "Belum" di tabel. */
  belumJudul: string[]
}

/**
 * Rekap per MAHASISWA: berapa tugas observasi yang sudah dia kumpulkan.
 * Ini yang dipakai tab "Progres Observasi" — pertanyaan dosen sehari-hari
 * bukan "tugas ini sudah berapa persen" tapi "siapa yang belum ngumpul".
 */
export function computeMahasiswaProgress(
  tugasList: ObservasiTugas[],
  students: ObservasiMahasiswa[],
  submissions: ObservasiSubmission[],
): MahasiswaProgress[] {
  const totalTugas = tugasList.length
  return students.map((m) => {
    const jawaban = submissions.filter((s) => s.userId === m.id)
    const idSudah = new Set(jawaban.map((s) => s.tugasId))
    // Hanya tugas yang masih ada di daftar yang dihitung — jawaban untuk tugas
    // yang sudah dihapus dosen tidak boleh bikin `sudah` > totalTugas.
    const sudah = tugasList.filter((t) => idSudah.has(t.id)).length
    return {
      userId: m.id,
      nama: m.nama,
      kelas: m.kelas,
      sudah,
      totalTugas,
      persen: totalTugas ? Math.round((sudah / totalTugas) * 100) : 0,
      perluRevisi: jawaban.filter((s) => s.status === 'revision').length,
      belumJudul: tugasList.filter((t) => !idSudah.has(t.id)).map((t) => t.judul),
    }
  })
}

export interface ObservasiRingkasan {
  totalTugas: number
  totalMahasiswa: number
  totalJawaban: number
  /** Persen sel "sudah dikumpulkan" dari seluruh matriks tugas × mahasiswa. */
  persenPengumpulan: number
  menunggu: number
  perluRevisi: number
}

export function ringkasObservasi(
  tugasList: ObservasiTugas[],
  students: ObservasiMahasiswa[],
  submissions: ObservasiSubmission[],
): ObservasiRingkasan {
  const idTugas = new Set(tugasList.map((t) => t.id))
  const idMhs = new Set(students.map((m) => m.id))
  // Hanya sel yang valid (tugas masih ada DAN mahasiswanya masih terlihat)
  // yang boleh masuk pembilang, karena penyebutnya juga matriks itu.
  const relevan = submissions.filter((s) => idTugas.has(s.tugasId) && idMhs.has(s.userId))
  const sel = tugasList.length * students.length
  return {
    totalTugas: tugasList.length,
    totalMahasiswa: students.length,
    totalJawaban: relevan.length,
    persenPengumpulan: sel ? Math.round((relevan.length / sel) * 100) : 0,
    menunggu: relevan.filter((s) => s.status === 'submitted').length,
    perluRevisi: relevan.filter((s) => s.status === 'revision').length,
  }
}

/** Tanggal ringkas ala tabel Asesmen — dipakai untuk deadline & waktu kumpul. */
export function formatTanggalObservasi(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function buildObservasiCsv(rows: MahasiswaProgress[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
  let csv = 'Nama,Kelas,Sudah Kumpul,Total Tugas,Persen,Perlu Revisi,Belum Dikumpulkan\n'
  for (const r of rows) {
    csv +=
      [
        esc(r.nama),
        esc(r.kelas ?? '—'),
        r.sudah,
        r.totalTugas,
        r.persen,
        r.perluRevisi,
        esc(r.belumJudul.join('; ')),
      ].join(',') + '\n'
  }
  return csv
}

// ════════════════════════════════════════════
//  I/O — Supabase saat terkonfigurasi, kalau tidak: mode demo
// ════════════════════════════════════════════
// Konvensi `null` vs `[]` dipertahankan sama seperti lib/asesmen.ts: `null`
// berarti "tidak terhubung / query gagal" (halaman menampilkan pesan mode
// demo), array kosong berarti "terhubung, memang belum ada datanya". Fungsi
// TULIS melempar error eksplisit di mode demo — menulis ke localStorage cuma
// akan mendarat di browser satu orang dan menyembunyikan kegagalan nyata di
// balik toast "berhasil" (alasan yang sama dipakai lib/kuisSoal.ts).

const TUGAS_COLUMNS = 'id, judul, deskripsi, module_id, deadline, order_num, created_by, created_at'
const SUBMISSION_COLUMNS =
  'id, tugas_id, user_id, isi_teks, file_url, file_name, status, catatan_dosen, submitted_at, updated_at'

export async function fetchObservasiTugas(): Promise<ObservasiTugas[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [tugasRes, modulesRes] = await Promise.all([
      supabase.from('observasi_tugas').select(TUGAS_COLUMNS).order('order_num').order('id'),
      supabase.from('modules').select('id, title'),
    ])
    if (tugasRes.error) throw tugasRes.error

    const judulModul = new Map<number, string>()
    for (const m of modulesRes.data ?? []) {
      judulModul.set(m.id as number, (m.title as string) || `Modul ${m.id}`)
    }

    return (tugasRes.data ?? []).map((r) => ({
      id: r.id as number,
      judul: (r.judul as string) || 'Tanpa judul',
      deskripsi: (r.deskripsi as string) || '',
      moduleId: (r.module_id as number | null) ?? null,
      modulJudul: r.module_id != null ? judulModul.get(r.module_id as number) ?? null : null,
      deadline: (r.deadline as string | null) ?? null,
      orderNum: (r.order_num as number) ?? 0,
      createdBy: r.created_by as string,
      createdAt: r.created_at as string,
    }))
  } catch (e) {
    console.warn('[observasi] fetchObservasiTugas gagal:', e)
    return null
  }
}

/** Daftar mahasiswa yang terlihat oleh akun ini — penyebut hitungan progres. */
export async function fetchObservasiMahasiswa(): Promise<ObservasiMahasiswa[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    // Embed lewat nama FK eksplisit: profiles<->classes punya DUA relasi, embed
    // polos ditolak PostgREST (PGRST201). Catatan yang sama ada di
    // lib/asesmen.ts dan lib/analitik.ts.
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, classes!profiles_class_id_fkey(name)')
      .eq('role', 'mahasiswa')
    if (error) throw error
    return (data ?? []).map((s) => {
      const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      return {
        id: s.id as string,
        nama: (s.full_name as string) || 'Tanpa nama',
        kelas: Array.isArray(rel) ? rel[0]?.name ?? null : rel?.name ?? null,
      }
    })
  } catch (e) {
    console.warn('[observasi] fetchObservasiMahasiswa gagal:', e)
    return null
  }
}

/**
 * Semua jawaban yang boleh dilihat akun ini. Untuk dosen: jawaban mahasiswa
 * di kelasnya; untuk mahasiswa: jawabannya sendiri — dua-duanya hasil RLS,
 * bukan filter di sini.
 */
export async function fetchObservasiSubmissions(): Promise<ObservasiSubmission[] | null> {
  if (!isSupabaseConfigured) return null
  try {
    const [subsRes, studentsRes] = await Promise.all([
      supabase.from('observasi_submissions').select(SUBMISSION_COLUMNS).order('submitted_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, classes!profiles_class_id_fkey(name)'),
    ])
    if (subsRes.error) throw subsRes.error

    const namaById = new Map<string, string>()
    const kelasById = new Map<string, string | null>()
    for (const s of studentsRes.data ?? []) {
      namaById.set(s.id as string, (s.full_name as string) || 'Tanpa nama')
      const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
      kelasById.set(s.id as string, Array.isArray(rel) ? rel[0]?.name ?? null : rel?.name ?? null)
    }

    return (subsRes.data ?? []).map((r) => ({
      id: r.id as number,
      tugasId: r.tugas_id as number,
      userId: r.user_id as string,
      nama: namaById.get(r.user_id as string) ?? 'Mahasiswa',
      kelas: kelasById.get(r.user_id as string) ?? null,
      isiTeks: (r.isi_teks as string) || '',
      fileUrl: (r.file_url as string | null) ?? null,
      fileName: (r.file_name as string | null) ?? null,
      status: ((r.status as ObservasiStatus) || 'submitted') as ObservasiStatus,
      catatanDosen: (r.catatan_dosen as string | null) ?? null,
      submittedAt: r.submitted_at as string,
      updatedAt: (r.updated_at as string) || (r.submitted_at as string),
    }))
  } catch (e) {
    console.warn('[observasi] fetchObservasiSubmissions gagal:', e)
    return null
  }
}

function butuhSupabase(fn: string): never {
  throw new Error(`${fn} membutuhkan koneksi Supabase — tidak tersedia di mode demo.`)
}

export interface ObservasiTugasInput {
  judul: string
  deskripsi: string
  moduleId: number | null
  /** ISO string, atau null kalau tugasnya tanpa batas waktu. */
  deadline: string | null
  orderNum: number
}

export async function createObservasiTugas(data: ObservasiTugasInput): Promise<void> {
  if (!isSupabaseConfigured) butuhSupabase('createObservasiTugas')
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  // created_by wajib & dipakai policy RLS — insert tanpa uid pasti ditolak,
  // jadi lebih baik gagal di sini dengan pesan yang jelas.
  if (!uid) throw new Error('Sesi tidak ditemukan — silakan login ulang.')
  const { error } = await supabase.from('observasi_tugas').insert({
    judul: data.judul,
    deskripsi: data.deskripsi,
    module_id: data.moduleId,
    deadline: data.deadline,
    order_num: data.orderNum,
    created_by: uid,
  })
  if (error) throw error
}

export async function updateObservasiTugas(id: number, data: ObservasiTugasInput): Promise<void> {
  if (!isSupabaseConfigured) butuhSupabase('updateObservasiTugas')
  // .select('id') sesudah update: UPDATE yang disaring RLS jadi 0 baris TIDAK
  // dianggap error oleh PostgREST, jadi tanpa cek ini kegagalan izin akan
  // tampil sebagai sukses. Persis pelajaran dari updateDraftStatus()
  // (lib/draf.ts) + migration_v12.
  const { data: rows, error } = await supabase
    .from('observasi_tugas')
    .update({
      judul: data.judul,
      deskripsi: data.deskripsi,
      module_id: data.moduleId,
      deadline: data.deadline,
      order_num: data.orderNum,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!rows || rows.length === 0) throw new Error('Perubahan tidak tersimpan (0 baris cocok — cek izin RLS).')
}

export async function deleteObservasiTugas(id: number): Promise<void> {
  if (!isSupabaseConfigured) butuhSupabase('deleteObservasiTugas')
  const { error } = await supabase.from('observasi_tugas').delete().eq('id', id)
  if (error) throw error
}

/**
 * Unggah berkas hasil observasi ke bucket public `observasi-file`.
 * Nama objek diawali UUID mahasiswa supaya policy `owner = auth.uid()` di
 * migration_v14 tetap masuk akal dilihat dari struktur foldernya juga.
 */
export async function uploadObservasiFile(tugasId: number, file: File): Promise<{ url: string; name: string }> {
  if (!isSupabaseConfigured) butuhSupabase('uploadObservasiFile')
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Sesi tidak ditemukan — silakan login ulang.')

  // Ekstensi dipertahankan supaya browser/OS tahu cara membuka berkasnya;
  // sisa nama asli dibuang karena bisa mengandung spasi/karakter non-ASCII
  // yang bikin URL Storage merepotkan.
  const dot = file.name.lastIndexOf('.')
  const ext = dot > 0 ? file.name.slice(dot + 1).toLowerCase().replace(/[^a-z0-9]/g, '') : ''
  const path = `${uid}/tugas-${tugasId}-${Date.now()}${ext ? `.${ext}` : ''}`

  const { error } = await supabase.storage
    .from('observasi-file')
    .upload(path, file, { upsert: true, contentType: file.type || undefined })
  if (error) throw error
  const { data } = supabase.storage.from('observasi-file').getPublicUrl(path)
  return { url: data.publicUrl, name: file.name }
}

export interface ObservasiSubmitInput {
  tugasId: number
  isiTeks: string
  fileUrl: string | null
  fileName: string | null
}

/**
 * Kirim / perbarui jawaban. Upsert on (tugas_id, user_id) — mengumpulkan ulang
 * memperbarui baris yang sama, bukan menumpuk versi baru (lihat UNIQUE di
 * migration_v14). `status` sengaja dikembalikan ke 'submitted' setiap kali
 * mahasiswa menyunting: revisi yang sudah diperbaiki harus antre diperiksa
 * lagi, bukan tetap bertanda "Perlu Revisi".
 *
 * `submitted_at` sengaja TIDAK ikut ditulis ulang — kolom itu berarti "kapan
 * pertama kali dikumpulkan", yang jadi dasar penilaian terlambat/tidak.
 * Kalau ikut diperbarui, mahasiswa yang telat bisa menghapus jejak
 * keterlambatannya hanya dengan menyunting ulang tulisannya. Waktu suntingan
 * terakhir tetap tercatat di `updated_at`.
 */
export async function submitObservasi(data: ObservasiSubmitInput): Promise<void> {
  if (!isSupabaseConfigured) butuhSupabase('submitObservasi')
  const { data: userData } = await supabase.auth.getUser()
  const uid = userData.user?.id
  if (!uid) throw new Error('Sesi tidak ditemukan — silakan login ulang.')
  if (data.isiTeks.trim() === '' && !data.fileUrl) {
    throw new Error('Isi tulisan hasil observasi atau unggah berkasnya dulu.')
  }
  const { error } = await supabase.from('observasi_submissions').upsert(
    {
      tugas_id: data.tugasId,
      user_id: uid,
      isi_teks: data.isiTeks,
      file_url: data.fileUrl,
      file_name: data.fileName,
      status: 'submitted',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tugas_id,user_id' },
  )
  if (error) throw error
}

export async function updateObservasiReview(
  id: number,
  status: ObservasiStatus,
  catatanDosen: string | null,
): Promise<void> {
  if (!isSupabaseConfigured) butuhSupabase('updateObservasiReview')
  const { data, error } = await supabase
    .from('observasi_submissions')
    .update({ status, catatan_dosen: catatanDosen, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('id')
  if (error) throw error
  if (!data || data.length === 0) throw new Error('Catatan tidak tersimpan (0 baris cocok — cek izin RLS).')
}
