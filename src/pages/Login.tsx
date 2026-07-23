import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')

    if (!isSupabaseConfigured) {
      setError('Login belum bisa diproses — konfigurasi server belum lengkap. Hubungi admin.')
      return
    }

    setLoading(true)
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })
      if (signInError) throw signInError

      let { data: profile } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user!.id)
        .single()

      if (!profile) {
        const meta = data.user!.user_metadata || {}
        await supabase.from('profiles').upsert({
          id: data.user!.id,
          full_name: meta.full_name || email.split('@')[0],
          role: meta.role || role,
          nim_nidn: meta.nim_nidn || '',
        })
        const { data: p2 } = await supabase
          .from('profiles')
          .select('role, full_name')
          .eq('id', data.user!.id)
          .single()
        profile = p2
      }

      if (!profile) profile = { role, full_name: email.split('@')[0] }

      if (profile.role !== role) {
        await supabase.auth.signOut()
        throw new Error(
          `Akun ini terdaftar sebagai ${profile.role === 'dosen' ? 'Dosen' : 'Mahasiswa'}. Silakan pilih peran yang sesuai.`,
        )
      }

      navigate('/dashboard')
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Terjadi kesalahan. Coba lagi.'
      if (msg.includes('Invalid login credentials')) msg = 'Email atau kata sandi salah.'
      if (msg.includes('Email not confirmed')) msg = 'Email belum dikonfirmasi. Cek inbox kamu.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream">
      <form onSubmit={handleSubmit} className="bg-ivory p-8 rounded-xl shadow-md w-full max-w-sm">
        <h1 className="text-xl font-bold text-brown mb-4">Masuk ke Akun</h1>

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

        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded p-2 mb-3"
        />

        <label htmlFor="password">Kata Sandi</label>
        <input
          id="password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2 mb-4"
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-terra text-white rounded-full py-2 font-semibold"
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>
    </div>
  )
}
