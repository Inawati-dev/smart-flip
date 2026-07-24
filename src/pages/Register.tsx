import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthShell, authInputClass, authInputStyle } from '../components/AuthShell'

// Client-side pre-check only, for instant form feedback — the REAL
// enforcement is server-side now (database/migration_v6_dosen_invite_gate.sql):
// handle_new_user() validates raw_user_meta_data->>'dosen_invite_code'
// against the dosen_invite_codes table before ever assigning role='dosen',
// and a BEFORE UPDATE trigger locks profiles.role against client-side
// changes after signup too. This function alone would still be bypassable
// via devtools; it's the migration that actually closes the hole.
export function isDosenInviteCodeValid(inputCode: string, expectedCode: string | undefined): boolean {
  if (!expectedCode) return false
  return inputCode.trim().length > 0 && inputCode.trim() === expectedCode
}

export function Register() {
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [fullName, setFullName] = useState('')
  const [nimNidn, setNimNidn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [classCode, setClassCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isSupabaseConfigured) {
      setError('Pendaftaran belum bisa diproses — konfigurasi server belum lengkap. Hubungi admin.')
      return
    }

    if (role === 'dosen' && !isDosenInviteCodeValid(inviteCode, import.meta.env.VITE_DOSEN_INVITE_CODE)) {
      setError('Kode undangan dosen tidak valid. Hubungi admin untuk mendapatkan kode undangan.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            nim_nidn: nimNidn.trim(),
            dosen_invite_code: role === 'dosen' ? inviteCode.trim() : undefined,
            // Optional -- unlike dosen_invite_code, an absent/wrong/full-class
            // code never blocks signup (see migration_v7_kelas.sql's
            // handle_new_user()): the mahasiswa just ends up with class_id
            // NULL, assignable manually later.
            class_code: role === 'mahasiswa' ? classCode.trim() || undefined : undefined,
          },
        },
      })
      if (signUpError) throw signUpError

      if (data.user) {
        // role sengaja tidak dikirim -- handle_new_user() (server) yang nentuin
        // final role berdasar dosen_invite_code, profiles_lock_role trigger akan
        // tolak diam-diam kalau tetap dikirim dari client.
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          nim_nidn: nimNidn.trim(),
        })
        if (profileError) console.warn('Profile upsert:', profileError.message)
      }

      setSuccess('Pendaftaran berhasil! Cek email untuk konfirmasi sebelum masuk.')
      setFullName('')
      setNimNidn('')
      setEmail('')
      setPassword('')
      setInviteCode('')
      setClassCode('')
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Terjadi kesalahan.'
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
          className="flex-1 h-11 rounded-[9px] border-[1.5px] text-sm font-semibold transition-colors"
          style={
            role === 'mahasiswa'
              ? { background: 'var(--brown)', borderColor: 'var(--brown)', color: 'var(--terra)' }
              : { borderColor: 'var(--border)', color: 'var(--brown-2)' }
          }
        >
          Mahasiswa
        </button>
        <button
          type="button"
          onClick={() => setRole('dosen')}
          className="flex-1 h-11 rounded-[9px] border-[1.5px] text-sm font-semibold transition-colors"
          style={
            role === 'dosen'
              ? { background: 'var(--brown)', borderColor: 'var(--brown)', color: 'var(--terra)' }
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            <label htmlFor="classCode" className="text-[0.78rem] font-semibold text-brown-2">
              Kode Kelas <span className="font-normal text-brown-3">(opsional)</span>
            </label>
            <input
              id="classCode"
              type="text"
              placeholder="Contoh: 7XQK2M — dari dosen Anda"
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              className={authInputClass}
              style={authInputStyle}
            />
            <p className="text-[13px] text-brown-3">
              Punya kode kelas dari dosen? Masukkan di sini agar langsung tergabung. Belum punya
              kode? Lewati saja — Anda tetap bisa daftar dan bergabung ke kelas belakangan.
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

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[50px] rounded-xl text-white font-semibold text-[0.95rem] disabled:opacity-50"
          style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.25)' }}
        >
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
