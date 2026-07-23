import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function Register() {
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [fullName, setFullName] = useState('')
  const [nimNidn, setNimNidn] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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

    setLoading(true)
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: { full_name: fullName.trim(), role, nim_nidn: nimNidn.trim() },
        },
      })
      if (signUpError) throw signUpError

      if (data.user) {
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName.trim(),
          nim_nidn: nimNidn.trim(),
          role,
        })
        if (profileError) console.warn('Profile upsert:', profileError.message)
      }

      setSuccess('Pendaftaran berhasil! Cek email untuk konfirmasi sebelum masuk.')
      setFullName('')
      setNimNidn('')
      setEmail('')
      setPassword('')
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
    <div className="min-h-screen flex items-center justify-center bg-cream px-4 py-6">
      <form onSubmit={handleSubmit} className="bg-ivory p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold text-brown mb-1">Buat Akun Baru</h1>
        <p className="text-brown-3 text-sm mb-4">Lengkapi data diri Anda untuk mendaftar</p>

        <div className="flex gap-2 mb-4">
          <button
            type="button"
            className={role === 'mahasiswa' ? 'font-bold text-terra' : 'text-brown-3'}
            onClick={() => setRole('mahasiswa')}
          >
            Mahasiswa
          </button>
          <button
            type="button"
            className={role === 'dosen' ? 'font-bold text-terra' : 'text-brown-3'}
            onClick={() => setRole('dosen')}
          >
            Dosen
          </button>
        </div>

        {error && <div className="text-red mb-3 text-sm">{error}</div>}
        {success && <div className="text-sage-d mb-3 text-sm">{success}</div>}

        <label htmlFor="fullName">Nama Lengkap</label>
        <input
          id="fullName"
          type="text"
          required
          placeholder="Nama sesuai KTP"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full border rounded p-2 mb-3"
        />

        <label htmlFor="nimNidn">{role === 'dosen' ? 'NIDN' : 'NIM'}</label>
        <input
          id="nimNidn"
          type="text"
          required
          placeholder={role === 'dosen' ? 'Nomor Induk Dosen Nasional' : 'Nomor Induk Mahasiswa'}
          value={nimNidn}
          onChange={(e) => setNimNidn(e.target.value)}
          className="w-full border rounded p-2 mb-3"
        />

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded p-2 mb-3"
        />

        <label htmlFor="password">Kata Sandi</label>
        <input
          id="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="Min. 8 karakter"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-terra text-white rounded-full py-2 font-semibold"
        >
          {loading ? 'Memproses…' : 'Daftar Sekarang'}
        </button>

        <p className="text-center text-sm text-brown-3 mt-4">
          Sudah punya akun?{' '}
          <Link to="/" className="text-sage-d font-semibold hover:underline">
            Masuk di sini
          </Link>
        </p>
      </form>
    </div>
  )
}
