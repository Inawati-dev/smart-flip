import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { authInputClass, authInputStyle } from '../components/AuthShell'
import { LoginFlipCard, FlipPanel } from '../components/LoginFlipCard'
import { LoginBook } from '../components/LoginBook'

// REVERT MODE — ganti ke 'flip' untuk balik ke tampilan kartu flip lama
// (satu baris, tanpa hapus kode). Bisa juga dites tanpa redeploy lewat URL:
// /login?variant=flip (lama) atau /login?variant=book (baru).
const LOGIN_VARIANT: 'book' | 'flip' = 'book'

function resolveVariant(): 'book' | 'flip' {
  if (typeof window !== 'undefined') {
    const v = new URLSearchParams(window.location.search).get('variant')
    if (v === 'flip' || v === 'book') return v
  }
  return LOGIN_VARIANT
}

export function Login() {
  const navigate = useNavigate()
  const [flipped, setFlipped] = useState(false)
  const [role, setRole] = useState<'mahasiswa' | 'dosen'>('mahasiswa')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // forgotMode swaps the back face's own content (login form <-> reset-email
  // form) instead of leaving the flip card for a separate AuthShell layout —
  // the card's front/back rotation is reserved for CTA-to-form, and this is a
  // sub-view within "back" so the card never jumps to an unrelated layout.
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

  const forgotView = (
    <>
      <button
        type="button"
        onClick={() => {
          setForgotMode(false)
          setForgotMsg('')
        }}
        className="self-start text-[13px] font-medium text-brown-3 hover:text-terra-d"
      >
        ← Kembali
      </button>

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
    </>
  )

  const loginView = (
    <>
      <button
        type="button"
        onClick={() => setFlipped(false)}
        className="self-start text-[13px] font-medium text-brown-3 hover:text-terra-d"
      >
        ← Kembali
      </button>

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
    </>
  )

  // ── Varian 'book' (Opsi C): buku berdiri 3D, sampul membuka ke form ──
  if (resolveVariant() === 'book') {
    const bookCover = (
      <>
        <div>
          <h1 className="font-display font-light text-[2.7rem] leading-[1.02] tracking-tight text-cream mb-2">
            Smart
            <br />
            Flip.{' '}
            <span className="text-[1.3rem] align-middle text-terra font-semibold">5.0</span>
          </h1>
          {/* Kredit penulis di bawah judul, gaya sampul buku sungguhan */}
          <p className="font-display italic text-[0.82rem] text-cream/55 mb-3.5">
            oleh Inawati, S.IP., M.M.
          </p>
          <p className="text-[0.84rem] leading-relaxed text-cream/65 mb-4">
            E-Modul Adaptif Metode Penelitian &amp; Pengembangan.
          </p>
          <div className="flex flex-col gap-1 text-[0.78rem] text-cream/50 border-t border-white/10 pt-3 mb-4">
            <span>Fakultas Vokasi</span>
            <span>Universitas Negeri Malang</span>
            <span>Dana Internal UM 2026</span>
          </div>
          <ul className="flex flex-col gap-1.5 text-[0.78rem] text-cream/45 list-disc pl-4">
            <li>Modul interaktif per-bab dengan video &amp; kuis</li>
            <li>Jalur belajar adaptif dari tes diagnostik</li>
            <li>Asesmen gaya belajar VARK</li>
            <li>Forum diskusi &amp; asistensi draf penelitian</li>
            <li>Progress otomatis, sinkron lintas perangkat</li>
          </ul>
        </div>
        <button
          type="button"
          onClick={() => setFlipped(true)}
          className="self-start h-[46px] px-6 rounded-xl font-semibold text-[0.92rem] mt-6 text-brown"
          style={{ background: 'var(--terra)', boxShadow: '0 4px 16px rgba(0,0,0,.28)' }}
        >
          Buka Buku →
        </button>
      </>
    )

    return (
      <div className="page-fadein min-h-screen bg-cream flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14 overflow-x-clip">
        <div className="w-full max-w-[400px]">
          <LoginBook
            open={flipped}
            onOpen={() => setFlipped(true)}
            cover={bookCover}
            page={
              <FlipPanel
                flipped={forgotMode}
                front={loginView}
                back={forgotView}
                faceClassName="flex flex-col gap-5"
              />
            }
          />
        </div>
      </div>
    )
  }

  // ── Varian 'flip' (lama) — dipertahankan utuh sebagai jalur revert ──
  return (
    <div className="page-fadein min-h-screen bg-cream flex items-center justify-center px-5 py-10 sm:px-10 sm:py-14">
      <div className="w-full max-w-[420px]">
        <LoginFlipCard
          flipped={flipped}
          front={
            <div className="flex flex-col justify-between h-full">
              <div>
                <p className="text-[11px] tracking-[.12em] uppercase font-semibold text-terra-d mb-4">
                  SMART-FLIP 5.0
                </p>
                <h1 className="font-display font-light text-[2.75rem] leading-[0.98] tracking-tight text-brown mb-4">
                  Smart
                  <br />
                  Flip.
                </h1>
                <p className="text-[0.9rem] leading-relaxed text-brown-2 mb-5">
                  E-Modul Adaptif Metode Penelitian &amp; Pengembangan — Fakultas Vokasi,
                  Universitas Negeri Malang.
                </p>
                <ul className="flex flex-col gap-1.5 text-[0.82rem] text-brown-3 list-disc pl-4">
                  <li>Baca modul interaktif per-bab</li>
                  <li>Progress tersimpan otomatis</li>
                  <li>Sinkron lintas perangkat</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => setFlipped(true)}
                className="w-full h-[50px] rounded-xl text-white font-semibold text-[0.95rem] mt-6"
                style={{ background: 'var(--brown)', boxShadow: '0 4px 16px rgba(44,36,32,.25)' }}
              >
                Masuk →
              </button>
            </div>
          }
          back={
            <FlipPanel flipped={forgotMode} front={loginView} back={forgotView} faceClassName="flex flex-col gap-5" />
          }
        />
      </div>
    </div>
  )
}
