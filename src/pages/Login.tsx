import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthShell, authInputClass, authInputStyle } from '../components/AuthShell'

export function Login() {
  const navigate = useNavigate()
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotMsg, setForgotMsg] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)

  async function handleForgotSubmit(e: FormEvent) {
    e.preventDefault()
    setForgotMsg('')

    if (!isSupabaseConfigured) {
      setForgotMsg('Fitur ini belum bisa diproses — konfigurasi server belum lengkap. Hubungi admin.')
      return
    }

    setForgotLoading(true)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (resetError) throw resetError
      setForgotMsg('Link reset password sudah dikirim. Cek inbox email kamu.')
    } catch (err) {
      setForgotMsg(err instanceof Error ? err.message : 'Gagal mengirim link reset. Coba lagi.')
    } finally {
      setForgotLoading(false)
    }
  }

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

      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, full_name')
        .eq('id', data.user!.id)
        .single()

      // PGRST116 = no row found — genuinely a first login, safe to bootstrap
      // below. Any other error (RLS, network) must NOT fall through to the
      // same bootstrap path: that would upsert role from the client-side
      // toggle and silently overwrite/create a role the user doesn't
      // actually have.
      if (profileError && profileError.code !== 'PGRST116') {
        await supabase.auth.signOut()
        throw new Error('Gagal memuat profil akun. Coba lagi atau hubungi admin.')
      }

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

  if (forgotMode) {
    return (
      <AuthShell>
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brown tracking-tight">
            Lupa Kata Sandi
          </h1>
          <p className="text-sm text-brown-3">Masukkan email untuk menerima link reset password</p>
        </div>

        {forgotMsg && (
          <div className="text-sm rounded-lg px-3 py-2.5 border border-sage/30 bg-sage/10 text-sage-d">
            {forgotMsg}
          </div>
        )}

        <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="forgotEmail" className="text-[0.78rem] font-semibold text-brown-2">
              Email
            </label>
            <input
              id="forgotEmail"
              type="email"
              required
              autoComplete="email"
              placeholder="nama@email.com"
              value={forgotEmail}
              onChange={(e) => setForgotEmail(e.target.value)}
              className={authInputClass}
              style={authInputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={forgotLoading}
            className="w-full h-[50px] rounded-xl text-white font-semibold text-[0.95rem] disabled:opacity-50"
            style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.25)' }}
          >
            {forgotLoading ? 'Mengirim…' : 'Kirim Link Reset'}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setForgotMode(false)
            setForgotMsg('')
          }}
          className="text-center text-[0.82rem] text-sage-d font-semibold hover:underline"
        >
          Kembali ke halaman masuk
        </button>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brown tracking-tight">
          Masuk ke Akun
        </h1>
        <p className="text-sm text-brown-3">Pilih peran dan masukkan kredensial Anda</p>
      </div>

      <div className="flex gap-2.5">
        <button
          type="button"
          onClick={() => setRole('mahasiswa')}
          className="flex-1 h-11 rounded-[9px] border-[1.5px] text-sm font-semibold transition-colors"
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
          className="flex-1 h-11 rounded-[9px] border-[1.5px] text-sm font-semibold transition-colors"
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            style={authInputStyle}
          />
        </div>

        <div className="flex justify-end -mt-1">
          <button
            type="button"
            onClick={() => setForgotMode(true)}
            className="text-[13px] font-medium text-sage-d hover:underline"
          >
            Lupa kata sandi?
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-[50px] rounded-xl text-white font-semibold text-[0.95rem] disabled:opacity-50"
          style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.25)' }}
        >
          {loading ? 'Memproses…' : 'Masuk'}
        </button>
      </form>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
        <div className="text-[13px] font-medium text-brown-3">atau</div>
        <div className="flex-1 h-px" style={{ background: 'var(--border)' }} />
      </div>

      <p className="text-center text-[0.82rem] text-brown-3">
        Belum punya akun?{' '}
        <Link to="/register" className="text-sage-d font-semibold hover:underline">
          Daftar di sini
        </Link>
      </p>
    </AuthShell>
  )
}
