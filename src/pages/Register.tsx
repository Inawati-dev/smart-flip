import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthShell, authInputClass, authInputStyle } from '../components/AuthShell'
import { verifyDosenInviteCode } from '../lib/inviteCode'
import { cekKodeMataKuliah } from '../lib/courses'

// Pengecekan awal di sisi klien saja, untuk umpan balik form yang instan —
// penegakan SEBENARNYA ada di server (database/migration_v6_dosen_invite_gate.sql):
// handle_new_user() memvalidasi raw_user_meta_data->>'dosen_invite_code'
// terhadap tabel dosen_invite_codes sebelum berani memberi role='dosen', dan
// trigger BEFORE UPDATE mengunci profiles.role dari perubahan sisi klien
// setelah signup. Fungsi ini sendiri masih bisa dilewati lewat devtools;
// migration itulah yang benar-benar menutup lubangnya.
//
// Dipertahankan sebagai fungsi murni supaya tetap gampang diuji, TAPI sejak
// migration v16 pemanggilnya tidak lagi membandingkan ke env build-time —
// lihat catatan di handleSubmit.
export function isDosenInviteCodeValid(inputCode: string, expectedCode: string | undefined): boolean {
  if (!expectedCode) return false
  return inputCode.trim().length > 0 && inputCode.trim() === expectedCode
}

const KODE_SALAH = 'Kode mata kuliah tidak dikenali. Periksa lagi atau minta kodenya ke dosen pengampu.'
// Sama persis dengan RAISE EXCEPTION di handle_new_user(), database/migration_v40_kelas_otomatis.sql.
const TEKS_TOLAK_KODE = 'Kode mata kuliah tidak dikenali'

export function Register() {
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [fullName, setFullName] = useState('')
  const [nimNidn, setNimNidn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isSupabaseConfigured) {
      setError('Pendaftaran belum bisa diproses: konfigurasi server belum lengkap. Hubungi admin.')
      return
    }

    // Verifikasi ke DB lewat RPC (migration v16), BUKAN ke env build-time
    // seperti sebelumnya. Alasannya: kode kini bisa diganti dosen dari halaman
    // Pengaturan; kalau klien masih membandingkan ke nilai yang dipanggang saat
    // build, mengganti kode akan langsung mematikan pendaftaran dosen sampai
    // ada rebuild — dua sumber kebenaran yang pasti lepas sinkron.
    // Kode mata kuliah wajib bagi mahasiswa (antrean #228): satu kode untuk
    // semua mahasiswa mata kuliah itu, supaya orang luar tetap tersaring. Kelas
    // tidak dipilih di sini; basis data menempatkannya sesudah tes diagnostik
    // awal (migration_v40). Pemicu handle_new_user() juga menolak kode salah.
    if (role === 'mahasiswa' && !courseCode.trim()) {
      setError('Kode mata kuliah wajib diisi. Minta kodenya ke dosen pengampu.')
      return
    }

    setLoading(true)
    if (role === 'mahasiswa' && (await cekKodeMataKuliah(courseCode)) === 'tidak_ada') {
      setError(KODE_SALAH)
      setLoading(false)
      return
    }
    if (role === 'dosen') {
      const ok = await verifyDosenInviteCode(inviteCode)
      if (!ok) {
        setError('Kode undangan dosen tidak valid. Hubungi admin untuk mendapatkan kode undangan.')
        setLoading(false)
        return
      }
    }

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          // Tanpa ini tautan konfirmasi memakai Site URL bawaan proyek Supabase
          // (http://localhost:3000), bukan domain aplikasi.
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: fullName.trim(),
            role,
            nim_nidn: nimNidn.trim(),
            dosen_invite_code: role === 'dosen' ? inviteCode.trim() : undefined,
            course_code: role === 'mahasiswa' ? courseCode.trim().toUpperCase() : undefined,
          },
        },
      })
      if (signUpError) throw signUpError
      // Baris profil (nama, peran, mata kuliah, NIM/NIDN) dibuat pemicu
      // handle_new_user() di basis data dari `data` di atas (NIM sejak
      // migration_v36). Dulu di sini ada upsert profil tanpa kolom `role`
      // yang selalu ditolak basis data dan hanya masuk console.warn
      // (antrean #178); sebelum email dikonfirmasi juga belum ada sesi
      // untuk menulis dari peramban.

      setSuccess('Pendaftaran berhasil! Cek email untuk konfirmasi sebelum masuk.')
      setFullName('')
      setNimNidn('')
      setEmail('')
      setPassword('')
      setInviteCode('')
      setCourseCode('')
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Terjadi kesalahan.'
      // Hanya penolakan kode dari pemicu handle_new_user (v40, teks RAISE-nya
      // persis) yang jadi pesan "kode salah". Galat basis data lain tetap umum.
      // Catatan: Supabase Auth biasanya menyembunyikan teks RAISE dan hanya
      // mengirim "Database error saving new user"; kode salah sudah tertangkap
      // lebih dulu oleh cekKodeMataKuliah di atas.
      if (role === 'mahasiswa' && msg.includes(TEKS_TOLAK_KODE)) msg = KODE_SALAH
      else if (msg.includes('Database error saving new user')) msg = 'Pendaftaran gagal di server. Coba lagi beberapa saat, atau hubungi dosen pengampu.'
      if (msg.includes('already registered')) msg = 'Email ini sudah terdaftar. Silakan masuk.'
      if (msg.includes('Email signups are disabled')) msg = 'Pendaftaran email belum diaktifkan. Hubungi admin.'
      if (msg.includes('Password should be')) msg = 'Kata sandi minimal 8 karakter.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brown tracking-tight">
          Buat Akun Baru
        </h1>
        <p className="text-sm text-brown-3">Lengkapi data diri Anda untuk mendaftar</p>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setRole('mahasiswa')}
          className="flex-1 h-11 rounded-[var(--radius-control)] border-[1.5px] text-sm font-semibold transition-colors"
          style={
            role === 'mahasiswa'
              ? { background: 'var(--brown)', borderColor: 'var(--brown)', color: 'var(--btn-text)' }
              : { borderColor: 'var(--border)', color: 'var(--brown-2)' }
          }
        >
          Mahasiswa
        </button>
        <button
          type="button"
          onClick={() => setRole('dosen')}
          className="flex-1 h-11 rounded-[var(--radius-control)] border-[1.5px] text-sm font-semibold transition-colors"
          style={
            role === 'dosen'
              ? { background: 'var(--brown)', borderColor: 'var(--brown)', color: 'var(--btn-text)' }
              : { borderColor: 'var(--border)', color: 'var(--brown-2)' }
          }
        >
          Dosen
        </button>
      </div>

      {error && (
        <div className="text-red text-sm rounded-lg px-3 py-2.5 border border-red/30 bg-red/10">{error}</div>
      )}
      {success && (
        <div className="text-sage-d text-sm rounded-lg px-3 py-2.5 border border-sage/30 bg-sage/10">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-[0.78rem] font-semibold text-brown-2">
            Nama Lengkap
          </label>
          <input
            id="fullName"
            type="text"
            required
            placeholder="Nama sesuai KTP"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={authInputClass}
            style={authInputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="nimNidn" className="text-[0.78rem] font-semibold text-brown-2">
            {role === 'dosen' ? 'NIDN' : 'NIM'}
          </label>
          <input
            id="nimNidn"
            type="text"
            required
            placeholder={role === 'dosen' ? 'Nomor Induk Dosen Nasional' : 'Nomor Induk Mahasiswa'}
            value={nimNidn}
            onChange={(e) => setNimNidn(e.target.value)}
            className={authInputClass}
            style={authInputStyle}
          />
        </div>

        {role === 'dosen' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="inviteCode" className="text-[0.78rem] font-semibold text-brown-2">
              Kode Undangan Dosen
            </label>
            <input
              id="inviteCode"
              type="text"
              required
              placeholder="Diberikan oleh admin"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className={authInputClass}
              style={authInputStyle}
            />
            <p className="text-[13px] text-brown-3">
              Pendaftaran sebagai Dosen memerlukan kode undangan dari admin.
            </p>
          </div>
        )}

        {role === 'mahasiswa' && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="courseCode" className="text-[0.78rem] font-semibold text-brown-2">
              Kode Mata Kuliah
            </label>
            <input
              id="courseCode"
              type="text"
              placeholder="Dari dosen pengampu"
              value={courseCode}
              onChange={(e) => setCourseCode(e.target.value)}
              required
              autoCapitalize="characters"
              className={authInputClass}
              style={authInputStyle}
            />
            <p className="text-[13px] text-brown-3">
              Wajib diisi. Kelas Anda ditentukan otomatis dari tes diagnostik awal sesudah masuk.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-[0.78rem] font-semibold text-brown-2">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
            style={authInputStyle}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-[0.78rem] font-semibold text-brown-2">
            Kata Sandi
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            placeholder="Min. 8 karakter"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authInputStyle}
          />
        </div>

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? 'Memproses…' : 'Daftar Sekarang'}
        </button>
      </form>

      <p className="text-center text-[0.82rem] text-brown-3">
        Sudah punya akun?{' '}
        <Link to="/" className="text-sage-d font-semibold hover:underline">
          Masuk di sini
        </Link>
      </p>
    </AuthShell>
  )
}
