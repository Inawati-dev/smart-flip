import { supabase, isSupabaseConfigured } from './supabase'

// Akses kode undangan dosen lewat RPC SECURITY DEFINER (lihat
// database/migration_v16_kode_undangan_dosen.sql). Tabel `dosen_invite_codes`
// sendiri tetap tertutup total dari klien — tiga fungsi di bawah ini
// satu-satunya pintunya, dan pengecekan perannya ada di sisi server, bukan di
// sini. Jangan pernah menambahkan query langsung ke tabel itu dari klien.

/**
 * Panjang minimum yang juga divalidasi ulang di sisi server. Angka ini HARUS
 * sama dengan pengecekan di set_dosen_invite_code() (migration v16) — kalau
 * berbeda, form di Pengaturan akan meloloskan kode yang kemudian ditolak server.
 */
export const MIN_INVITE_CODE_LENGTH = 6

export function isInviteCodeLongEnough(code: string): boolean {
  return code.trim().length >= MIN_INVITE_CODE_LENGTH
}

/**
 * Verifikasi kode saat pendaftaran. Dipanggil sebelum ada sesi, jadi RPC-nya
 * boleh diakses anon dan hanya membalas boolean — kode aslinya tidak pernah
 * dikirim ke klien.
 *
 * Fail-closed: kalau Supabase belum dikonfigurasi atau RPC-nya error, hasilnya
 * `false`. Lebih baik menolak pendaftaran dosen yang sah (mereka bisa coba
 * lagi / minta bantuan) daripada meloloskan yang tidak sah.
 */
export async function verifyDosenInviteCode(code: string): Promise<boolean> {
  if (!isSupabaseConfigured) return false
  const trimmed = code.trim()
  if (!trimmed) return false
  try {
    const { data, error } = await supabase.rpc('verify_dosen_invite_code', { submitted: trimmed })
    if (error) {
      // Jaring pengaman urutan rilis: frontend bisa saja sudah ter-deploy
      // sementara migration v16 belum sempat dijalankan di Supabase. Tanpa
      // cabang ini, RPC yang belum ada = semua pendaftaran dosen tertolak
      // sampai migration jalan. Kalau begitu, mundur sementara ke cara lama
      // (bandingkan ke env build-time). Server tetap penentu akhirnya —
      // handle_new_user() dari v6 sudah memvalidasi kode yang sama, jadi
      // fallback ini tidak melonggarkan keamanan, cuma menjaga alurnya hidup.
      const missingRpc =
        error.code === 'PGRST202' || /function .*verify_dosen_invite_code/i.test(error.message ?? '')
      if (missingRpc) {
        console.warn('[inviteCode] RPC belum ada (migration v16 belum jalan) — pakai env sementara.')
        const envCode = import.meta.env.VITE_DOSEN_INVITE_CODE as string | undefined
        return !!envCode && trimmed === envCode
      }
      throw error
    }
    return data === true
  } catch (e) {
    console.warn('[inviteCode] verifikasi gagal:', e)
    return false
  }
}

/** Baca kode yang berlaku. Hanya berhasil untuk sesi dosen. */
export async function getDosenInviteCode(): Promise<string | null> {
  if (!isSupabaseConfigured) return null
  const { data, error } = await supabase.rpc('get_dosen_invite_code')
  if (error) throw error
  return (data as string | null) ?? null
}

/** Ganti kode. Hanya berhasil untuk sesi dosen; server memvalidasi ulang panjangnya. */
export async function setDosenInviteCode(newCode: string): Promise<void> {
  if (!isSupabaseConfigured) {
    throw new Error('Mengganti kode undangan butuh koneksi Supabase — tidak tersedia di mode demo.')
  }
  const { error } = await supabase.rpc('set_dosen_invite_code', { new_code: newCode.trim() })
  if (error) throw error
}
