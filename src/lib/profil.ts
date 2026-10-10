import { supabase, isSupabaseConfigured } from './supabase'

// Extra profil fields not covered by AuthContext's Profile (which only exposes
// the real `profiles` columns: full_name, role, nim_nidn, learning_style).
// Mirrors legacy/data-layer.js saveProfil/getProfil (profil.html-specific store).
// `nama`/`nim` are mirrored here too (in addition to living on AuthContext /
// the real `profiles` table) purely so an edit survives a page reload when
// Supabase isn't configured — matches legacy's single sfp_profil blob, where
// the whole payload (name included) round-trips through localStorage.
export interface ProfilExtra {
  nama: string
  nim: string
  prodi: string
  angkatan: string
  jabatan: string
  fakultas: string
}

const LS_KEY = 'sfp_profil'

function readLocalProfil(): Partial<ProfilExtra> | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? (JSON.parse(raw) as Partial<ProfilExtra>) : null
  } catch {
    return null
  }
}

function writeLocalProfil(data: Partial<ProfilExtra>): void {
  const existing = readLocalProfil() || {}
  // Filter out undefined values before merging — a caller passing
  // { jabatan: undefined } (e.g. a save that doesn't touch that field) must
  // not clobber an existing stored value, since {...existing, jabatan: undefined}
  // still sets the key, overwriting whatever was there.
  const defined = Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))
  try {
    localStorage.setItem(LS_KEY, JSON.stringify({ ...existing, ...defined }))
  } catch {
    // Penyimpanan peramban penuh atau diblokir: cermin lokal dilewati, supaya
    // simpan yang sudah masuk basis data tidak dilaporkan gagal (antrean #176).
  }
}

// Mirrors legacy/data-layer.js getProfil(). Note: prodi/angkatan/jabatan/fakultas
// are legacy-only columns — not present in database/schema.sql (which only has
// full_name, nim_nidn, role, learning_style, avatar_url on `profiles`) — so this
// Supabase query always errors and falls through to localStorage in the current
// schema, same as it does in production today.
export async function fetchProfilExtra(): Promise<Partial<ProfilExtra> | null> {
  if (isSupabaseConfigured) {
    try {
      const { data: userData } = await supabase.auth.getUser()
      const uid = userData.user?.id
      if (uid) {
        const { data, error } = await supabase
          .from('profiles')
          .select('full_name, nim_nidn, prodi, angkatan, jabatan, fakultas')
          .eq('id', uid)
          .single()
        if (error) throw error
        if (!data) return null
        const row = data as {
          full_name?: string
          nim_nidn?: string
          prodi?: string
          angkatan?: string
          jabatan?: string
          fakultas?: string
        }
        return {
          nama: row.full_name,
          nim: row.nim_nidn,
          prodi: row.prodi,
          angkatan: row.angkatan,
          jabatan: row.jabatan,
          fakultas: row.fakultas,
        }
      }
    } catch {
      // fall through to localStorage
    }
  }
  return readLocalProfil()
}

export interface SaveProfilInput {
  nama: string
  nim?: string
  prodi?: string
  angkatan?: string
  jabatan?: string
  fakultas?: string
  avatarUrl?: string
}

// Mirrors legacy/data-layer.js saveProfil(). Saves the core (real-schema)
// full_name/nim_nidn/avatar_url fields to Supabase, and mirrors the payload to
// localStorage so prodi/angkatan/jabatan/fakultas survive.
//
// Antrean #176: dulu memakai upsert tanpa kolom `role`. `role` wajib isi tanpa
// nilai bawaan (schema.sql), dan Postgres memeriksa wajib-isi pada baris yang
// diusulkan SEBELUM menangani bentrok kunci, jadi upsert itu selalu ditolak;
// galatnya tertelan dan layar tetap menulis "berhasil". Baris profil selalu
// sudah ada (dibuat saat daftar), jadi cukup `update`. Kegagalan dilempar
// supaya pemanggil menampilkannya apa adanya.
export async function saveProfilExtra(data: SaveProfilInput): Promise<void> {
  if (isSupabaseConfigured) {
    const { data: userData } = await supabase.auth.getUser()
    const uid = userData.user?.id
    if (!uid) throw new Error('Sesi berakhir. Masuk lagi lalu ulangi.')
    const row: { full_name: string; nim_nidn?: string; avatar_url?: string } = {
      full_name: data.nama,
      nim_nidn: data.nim,
    }
    if (data.avatarUrl !== undefined) row.avatar_url = data.avatarUrl
    const { data: berubah, error } = await supabase.from('profiles').update(row).eq('id', uid).select('id')
    if (error) throw new Error(error.message)
    if (!berubah || berubah.length === 0) throw new Error('Profil tidak ditemukan, perubahan tidak tersimpan.')
  }
  writeLocalProfil({
    nama: data.nama,
    nim: data.nim,
    prodi: data.prodi,
    angkatan: data.angkatan,
    jabatan: data.jabatan,
    fakultas: data.fakultas,
  })
}
