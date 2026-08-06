import { supabase, isSupabaseConfigured } from './supabase'
// Sengaja dipakai ulang, bukan disalin: format tanggal relatif ("3 jam lalu")
// di halaman ini harus persis sama dengan yang dilihat mahasiswa di /draf.
import { formatDraftDate } from './draf'

// ── Kenapa modul & tabel sendiri, bukan menumpang `drafts`/src/lib/draf.ts ──
// `drafts` itu ALIRAN: banyak baris per mahasiswa, satu per modul, versi
// bertambah tiap kirim ulang, dan seluruh /draf berdiri di atas asumsi "daftar
// draf per modul". Projek akhir kebalikannya: SATU baris jangka panjang per
// mahasiswa, tanpa modul induk, berstruktur bab proposal yang tetap, dengan
// siklus status sendiri (draf → diajukan → revisi → disetujui). Menumpang
// `drafts` berarti module_id jadi nullable, muncul kolom pembeda `kind` yang
// harus ikut disaring di setiap query dan setiap tampilan /draf yang sudah
// berjalan, plus dua kosakata status berdesakan di satu kolom — lebih banyak
// kerusakan di fitur lama ketimbang satu tabel kecil yang berdiri sendiri.
// Pertimbangan lengkapnya ada di database/migration_v15_projek_akhir.sql.

export type ProjekStatus = 'draf' | 'diajukan' | 'revisi' | 'disetujui'

export interface ProjekAkhir {
  id: string
  userId: string
  /** Diisi untuk daftar dosen; di tampilan mahasiswa cukup nama dirinya sendiri. */
  nama: string
  kelas: string | null
  judul: string
  ringkasan: string
  latarBelakang: string
  rumusanMasalah: string
  tujuan: string
  metode: string
  /** Path objek Storage (bucket privat), atau blob: URL di mode demo. */
  filePath: string | null
  fileName: string | null
  status: ProjekStatus
  catatanDosen: string
  submittedAt: string | null
  reviewedAt: string | null
  updatedAt: string
}

/** Bagian proposal yang boleh ditulis langsung di sistem (tanpa unggah berkas). */
export type BagianKey = 'ringkasan' | 'latarBelakang' | 'rumusanMasalah' | 'tujuan' | 'metode'

export interface BagianProposal {
  key: BagianKey
  label: string
  petunjuk: string
}

// Urutannya mengikuti kerangka proposal R&D yang dipakai Modul 4 ("Penyusunan
// Bab 1 Proposal") di database/schema.sql, biar mahasiswa tidak perlu
// menerjemahkan istilah dari materi ke form ini.
export const BAGIAN_PROPOSAL: BagianProposal[] = [
  {
    key: 'ringkasan',
    label: 'Ringkasan / Abstrak',
    petunjuk: 'Gambaran singkat produk yang dikembangkan dan sasarannya.',
  },
  {
    key: 'latarBelakang',
    label: 'Latar Belakang',
    petunjuk: 'Kesenjangan yang ditemukan di lapangan dan kenapa perlu dipecahkan.',
  },
  {
    key: 'rumusanMasalah',
    label: 'Rumusan Masalah',
    petunjuk: 'Pertanyaan penelitian yang akan dijawab lewat pengembangan produk.',
  },
  {
    key: 'tujuan',
    label: 'Tujuan & Manfaat',
    petunjuk: 'Apa yang ingin dicapai dan siapa saja yang diuntungkan.',
  },
  {
    key: 'metode',
    label: 'Metode Pengembangan',
    petunjuk: 'Model R&D yang dipilih (ADDIE / 4D / Borg & Gall) beserta alasannya.',
  },
]

export const STATUS_LABEL: Record<ProjekStatus, string> = {
  draf: 'Draf',
  diajukan: 'Menunggu Tinjauan',
  revisi: 'Perlu Revisi',
  disetujui: 'Disetujui',
}

// Warna badge sengaja senada dengan STATUS_BADGE di src/lib/draf.ts supaya
// mahasiswa membaca "kuning = ditunggu, merah = revisi, hijau = beres" dengan
// arti yang sama di dua halaman.
export const STATUS_BADGE: Record<ProjekStatus, { bg: string; color: string }> = {
  draf: { bg: '#E6E1D6', color: '#5C5245' },
  diajukan: { bg: '#FAE8A0', color: '#705010' },
  revisi: { bg: '#FDDAD9', color: '#B03020' },
  disetujui: { bg: '#C0DD97', color: '#27500A' },
}

/** Status yang boleh dipilih dosen saat meninjau (dua sisanya milik mahasiswa). */
export const STATUS_DOSEN: ProjekStatus[] = ['diajukan', 'revisi', 'disetujui']

export { formatDraftDate as formatProjekDate }

const LS_KEY = 'sfp_projek_akhir'

// Ambang "satu bagian dianggap terisi". Kalau cuma dicek non-kosong, meter
// kelengkapan langsung melonjak gara-gara satu huruf dan jadi tidak berarti;
// 20 karakter kira-kira satu kalimat pendek — cukup rendah untuk tidak
// menghakimi, cukup tinggi untuk tidak bisa dicurangi tanpa sadar.
export const MIN_ISI_BAGIAN = 20

// ── Helper murni (tanpa I/O) — semuanya diuji di projekAkhir.test.ts ──

export function projekKosong(userId = '', nama = 'Mahasiswa'): ProjekAkhir {
  return {
    id: '',
    userId,
    nama,
    kelas: null,
    judul: '',
    ringkasan: '',
    latarBelakang: '',
    rumusanMasalah: '',
    tujuan: '',
    metode: '',
    filePath: null,
    fileName: null,
    status: 'draf',
    catatanDosen: '',
    submittedAt: null,
    reviewedAt: null,
    updatedAt: new Date().toISOString(),
  }
}

export function bagianTerisi(p: ProjekAkhir, key: BagianKey): boolean {
  return (p[key] || '').trim().length >= MIN_ISI_BAGIAN
}

/**
 * Persentase kelengkapan proposal (0–100). Judul, kelima bagian tulisan, dan
 * berkas unggahan masing-masing dihitung satu butir — spesifikasi fiturnya
 * memang "unggah ATAU tulis di sistem", jadi berkas ikut menaikkan angka tapi
 * tidak pernah jadi syarat mutlak untuk mencapai 100 lewat jalur tulisan.
 */
export function hitungKelengkapan(p: ProjekAkhir): number {
  const butir = [
    p.judul.trim().length > 0,
    ...BAGIAN_PROPOSAL.map((b) => bagianTerisi(p, b.key)),
    !!p.filePath,
  ]
  const terisi = butir.filter(Boolean).length
  return Math.round((terisi / butir.length) * 100)
}

/**
 * Pesan penghalang kalau proposal belum layak diajukan, atau null kalau boleh.
 * Aturannya langsung menerjemahkan spesifikasi: judul wajib, lalu minimal ada
 * SALAH SATU wujud proposal — berkas terunggah atau satu bagian tulisan.
 */
export function validasiPengajuan(p: ProjekAkhir): string | null {
  if (!p.judul.trim()) return 'Judul proposal wajib diisi sebelum diajukan.'
  const adaTulisan = BAGIAN_PROPOSAL.some((b) => bagianTerisi(p, b.key))
  if (!p.filePath && !adaTulisan) {
    return 'Unggah berkas proposal atau tulis minimal satu bagian di sistem dulu, ya.'
  }
  return null
}

export interface RekapProjek {
  total: number
  draf: number
  diajukan: number
  revisi: number
  disetujui: number
}

/** Angka ringkasan untuk kartu statistik di tampilan dosen. */
export function rekapStatus(list: ProjekAkhir[]): RekapProjek {
  const rekap: RekapProjek = { total: list.length, draf: 0, diajukan: 0, revisi: 0, disetujui: 0 }
  for (const p of list) rekap[p.status]++
  return rekap
}

/**
 * Nama objek Storage untuk sebuah berkas. Dipisah jadi folder per user_id
 * karena semua policy bucket `projek-akhir` (migration v15) memakai folder
 * terdepan sebagai penanda pemilik. Nama file dibersihkan supaya karakter
 * aneh dari nama berkas mahasiswa tidak bikin path Storage ditolak.
 */
export function namaObjekProjek(userId: string, fileName: string): string {
  const bersih = fileName.replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-80)
  return `${userId}/${Date.now()}-${bersih}`
}

/** Ukuran berkas dalam satuan yang enak dibaca; dipakai di label unggahan. */
export function formatUkuran(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// blob:/http: berarti berkas mode demo (object URL lokal) atau tautan yang
// sudah jadi — hanya path objek Storage yang perlu ditandatangani.
export function perluSignedUrl(path: string | null | undefined): boolean {
  if (!path) return false
  return !/^(blob:|https?:)/i.test(path)
}

// ── Akses data — dwimode: Supabase kalau dikonfigurasi, selain itu localStorage ──
// Mode demo menyimpan SATU proposal saja (fitur ini memang satu per mahasiswa),
// dan daftar dosen membacanya balik sebagai satu baris supaya kedua tampilan
// tetap bisa dijelajahi tanpa koneksi Supabase.

function bacaLokal(): ProjekAkhir | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as ProjekAkhir) : null
  } catch {
    return null
  }
}

function tulisLokal(p: ProjekAkhir): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(p))
  } catch {
    // abaikan galat kuota/serialisasi — sama seperti lsSet di lib lain
  }
}

type Baris = Record<string, unknown>

function petakanBaris(r: Baris, nama: string, kelas: string | null): ProjekAkhir {
  return {
    id: String(r.id),
    userId: r.user_id as string,
    nama,
    kelas,
    judul: (r.judul as string) || '',
    ringkasan: (r.ringkasan as string) || '',
    latarBelakang: (r.latar_belakang as string) || '',
    rumusanMasalah: (r.rumusan_masalah as string) || '',
    tujuan: (r.tujuan as string) || '',
    metode: (r.metode as string) || '',
    filePath: (r.file_path as string) || null,
    fileName: (r.file_name as string) || null,
    status: (r.status as ProjekStatus) || 'draf',
    catatanDosen: (r.catatan_dosen as string) || '',
    submittedAt: (r.submitted_at as string) || null,
    reviewedAt: (r.reviewed_at as string) || null,
    updatedAt: (r.updated_at as string) || new Date().toISOString(),
  }
}

/** Proposal milik mahasiswa yang sedang login; null kalau belum pernah dibuat. */
export async function fetchProjekSaya(nama = 'Mahasiswa'): Promise<ProjekAkhir | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('final_projects')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()
        if (error) throw error
        return data ? petakanBaris(data as Baris, nama, null) : null
      }
    } catch (e) {
      console.warn('[projekAkhir] fetchProjekSaya → Supabase gagal, fallback localStorage:', e)
    }
  }
  return bacaLokal()
}

export interface SimpanProjekInput {
  judul: string
  ringkasan: string
  latarBelakang: string
  rumusanMasalah: string
  tujuan: string
  metode: string
  filePath?: string | null
  fileName?: string | null
}

/**
 * Simpan isi proposal (upsert — satu baris per mahasiswa, lihat UNIQUE
 * user_id di migrasi v15). `status` dan `catatan_dosen` sengaja TIDAK ikut
 * dikirim: keduanya wewenang dosen dan dijaga trigger di sisi database.
 */
export async function simpanProjek(input: SimpanProjekInput, nama = 'Mahasiswa'): Promise<ProjekAkhir> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const payload: Baris = {
          user_id: uid,
          judul: input.judul,
          ringkasan: input.ringkasan,
          latar_belakang: input.latarBelakang,
          rumusan_masalah: input.rumusanMasalah,
          tujuan: input.tujuan,
          metode: input.metode,
        }
        // undefined = "jangan sentuh kolom berkas" (mis. simpan teks saja),
        // null = "kosongkan" (mis. berkas baru saja dihapus). Dua-duanya beda
        // maksud, jadi pengecekannya harus `!== undefined`, bukan truthy.
        if (input.filePath !== undefined) payload.file_path = input.filePath
        if (input.fileName !== undefined) payload.file_name = input.fileName

        const { data, error } = await supabase
          .from('final_projects')
          .upsert(payload, { onConflict: 'user_id' })
          .select()
          .single()
        if (error) throw error
        return petakanBaris(data as Baris, nama, null)
      }
    } catch (e) {
      console.warn('[projekAkhir] simpanProjek → Supabase gagal, fallback localStorage:', e)
    }
  }

  const lama = bacaLokal() ?? projekKosong('demo-user', nama)
  const baru: ProjekAkhir = {
    ...lama,
    id: lama.id || 'projek_' + Date.now(),
    nama,
    judul: input.judul,
    ringkasan: input.ringkasan,
    latarBelakang: input.latarBelakang,
    rumusanMasalah: input.rumusanMasalah,
    tujuan: input.tujuan,
    metode: input.metode,
    filePath: input.filePath !== undefined ? input.filePath : lama.filePath,
    fileName: input.fileName !== undefined ? input.fileName : lama.fileName,
    updatedAt: new Date().toISOString(),
  }
  tulisLokal(baru)
  return baru
}

/** Mahasiswa mengajukan proposalnya ke dosen (draf/revisi → diajukan). */
export async function ajukanProjek(id: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      // Pola .select('id') + cek 0 baris — sama seperti updateDraftStatus di
      // src/lib/draf.ts: UPDATE yang disaring RLS jadi 0 baris TIDAK dianggap
      // error oleh Postgrest, jadi tanpa cek ini kegagalan izin akan tampil
      // sebagai "berhasil diajukan" padahal tidak ada yang tersimpan.
      const { data, error } = await supabase
        .from('final_projects')
        .update({ status: 'diajukan' })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Update matched 0 rows (RLS?)')
      return
    } catch (e) {
      console.warn('[projekAkhir] ajukanProjek → Supabase gagal:', e)
      throw e
    }
  }
  const lama = bacaLokal()
  if (!lama) return
  tulisLokal({ ...lama, status: 'diajukan', submittedAt: new Date().toISOString() })
}

/** Dosen memberi vonis + catatan. Hanya dua kolom ini yang boleh dia sentuh. */
export async function nilaiProjek(id: string, status: ProjekStatus, catatan: string): Promise<void> {
  if (isSupabaseConfigured) {
    try {
      // Cek 0 baris yang sama seperti ajukanProjek — di sinilah bug produksi
      // /draf dulu bersembunyi (dosen tidak punya policy UPDATE sama sekali).
      const { data, error } = await supabase
        .from('final_projects')
        .update({ status, catatan_dosen: catatan })
        .eq('id', id)
        .select('id')
      if (error) throw error
      if (!data || data.length === 0) throw new Error('Update matched 0 rows (RLS?)')
      return
    } catch (e) {
      console.warn('[projekAkhir] nilaiProjek → Supabase gagal:', e)
      throw e
    }
  }
  const lama = bacaLokal()
  if (!lama) return
  tulisLokal({ ...lama, status, catatanDosen: catatan, reviewedAt: new Date().toISOString() })
}

/** Daftar projek akhir mahasiswa yang jadi tanggung jawab dosen yang login. */
export async function fetchProjekKelas(): Promise<ProjekAkhir[]> {
  if (isSupabaseConfigured) {
    try {
      // Cakupan barisnya sudah dibatasi RLS (is_dosen_of, migration v13/v15),
      // jadi select polos otomatis hanya mengembalikan mahasiswa kelas dosen
      // ini — tidak perlu filter manual di klien.
      const [projekRes, mhsRes] = await Promise.all([
        supabase.from('final_projects').select('*').order('updated_at', { ascending: false }),
        // Embed eksplisit lewat nama FK — profiles<->classes punya DUA relasi,
        // embed tanpa kualifikasi ditolak PostgREST (PGRST201). Catatan yang
        // sama ada di asesmen.ts dan analitik.ts.
        supabase
          .from('profiles')
          .select('id, full_name, classes!profiles_class_id_fkey(name)')
          .eq('role', 'mahasiswa'),
      ])
      if (projekRes.error) throw projekRes.error

      const namaById = new Map<string, string>()
      const kelasById = new Map<string, string | null>()
      for (const s of mhsRes.data ?? []) {
        namaById.set(s.id as string, (s.full_name as string) || 'Tanpa nama')
        const rel = (s as { classes?: { name: string } | { name: string }[] | null }).classes
        kelasById.set(s.id as string, Array.isArray(rel) ? (rel[0]?.name ?? null) : (rel?.name ?? null))
      }

      return (projekRes.data ?? []).map((r) => {
        const uid = (r as Baris).user_id as string
        return petakanBaris(r as Baris, namaById.get(uid) ?? 'Mahasiswa', kelasById.get(uid) ?? null)
      })
    } catch (e) {
      console.warn('[projekAkhir] fetchProjekKelas → Supabase gagal, fallback localStorage:', e)
    }
  }
  const lokal = bacaLokal()
  return lokal ? [lokal] : []
}

/** Unggah berkas proposal; mengembalikan path objek + nama asli berkasnya. */
export async function unggahBerkasProjek(file: File): Promise<{ path: string; name: string }> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) throw new Error('Sesi tidak ditemukan — coba masuk ulang.')
    const path = namaObjekProjek(uid, file.name)
    const { error } = await supabase.storage
      .from('projek-akhir')
      .upload(path, file, { upsert: true, contentType: file.type || 'application/octet-stream' })
    if (error) throw error
    return { path, name: file.name }
  }
  // Mode demo: tidak ada Storage, berkasnya tidak pernah meninggalkan browser.
  return { path: URL.createObjectURL(file), name: file.name }
}

/** Buang berkas dari Storage. Dipanggil setelah konfirmasi di UI. */
export async function hapusBerkasProjek(path: string): Promise<void> {
  if (isSupabaseConfigured && perluSignedUrl(path)) {
    const { error } = await supabase.storage.from('projek-akhir').remove([path])
    // Baris DB tetap dibersihkan pemanggil walau file-nya sudah lenyap duluan;
    // gagal menghapus objek yang memang tidak ada jangan bikin aksi ini merah.
    if (error) console.warn('[projekAkhir] hapusBerkasProjek → gagal hapus objek Storage:', error)
  }
}

/**
 * Tautan unduh berkas. Bucket-nya privat, jadi tiap permintaan dibuatkan
 * signed URL baru berumur pendek — bukan URL permanen yang bisa disebar.
 */
export async function urlBerkasProjek(path: string | null): Promise<string | null> {
  if (!path) return null
  if (!perluSignedUrl(path)) return path
  if (!isSupabaseConfigured) return null
  try {
    const { data, error } = await supabase.storage.from('projek-akhir').createSignedUrl(path, 3600)
    if (error) throw error
    return data?.signedUrl ?? null
  } catch (e) {
    console.warn('[projekAkhir] urlBerkasProjek → gagal membuat signed URL:', e)
    return null
  }
}
