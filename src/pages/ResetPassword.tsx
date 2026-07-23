import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { AuthShell } from '../components/AuthShell'
import { IconCheck } from '../components/icons'

type View = 'loading' | 'form' | 'success' | 'error'

function calcStrength(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 6) s++
  if (pw.length >= 10) s++
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}

const STRENGTH_COLORS = ['bg-brown-3/30', 'bg-red', 'bg-terra-d', 'bg-sage', 'bg-sage-d']

export function ResetPassword() {
  // Demo mode skips token verification entirely and shows the form right away.
  const [view, setView] = useState<View>(isSupabaseConfigured ? 'loading' : 'form')
  const [errorDetail, setErrorDetail] = useState('')
  const [errorTitle, setErrorTitle] = useState('Link Tidak Valid')
  const [errorSub, setErrorSub] = useState(
    'Link reset password sudah kedaluwarsa atau tidak valid. Silakan minta link baru.',
  )

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pw1Error, setPw1Error] = useState('')
  const [pw2Error, setPw2Error] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [loading, setLoading] = useState(false)

  // Parse the recovery link's hash fragment and establish the recovery session.
  useEffect(() => {
    if (!isSupabaseConfigured) return

    const hash = new URLSearchParams(window.location.hash.substring(1))
    const accessToken = hash.get('access_token')
    const refreshToken = hash.get('refresh_token') || ''
    const type = hash.get('type')

    if (!accessToken || type !== 'recovery') {
      setErrorTitle('Link Tidak Valid')
      setErrorSub('')
      const errDesc = hash.get('error_description')
      if (errDesc) setErrorDetail(decodeURIComponent(errDesc.replace(/\+/g, ' ')))
      setView('error')
      return
    }

    ;(async () => {
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) throw sessionError

        // Clear hash from URL to prevent reuse
        window.history.replaceState(null, '', window.location.pathname)
        setView('form')
      } catch (err) {
        setErrorTitle('Link Kedaluwarsa')
        setErrorSub('')
        setErrorDetail(err instanceof Error ? err.message : 'Token tidak valid atau sudah kedaluwarsa.')
        setView('error')
      }
    })()
  }, [])

  function onPw1Change(value: string) {
    setPassword(value)
    setPw1Error('')
    if (confirmPassword && value !== confirmPassword) {
      setPw2Error('Password tidak cocok.')
    } else {
      setPw2Error('')
    }
  }

  function onPw2Change(value: string) {
    setConfirmPassword(value)
    if (value && value !== password) {
      setPw2Error('Password tidak cocok.')
    } else {
      setPw2Error('')
    }
  }

  function validate(): boolean {
    let ok = true
    if (password.length < 6) {
      setPw1Error('Password minimal 6 karakter.')
      ok = false
    } else {
      setPw1Error('')
    }
    if (password !== confirmPassword) {
      setPw2Error('Password tidak cocok.')
      ok = false
    } else {
      setPw2Error('')
    }
    return ok
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setLoading(true)

    if (!isSupabaseConfigured) {
      // Demo: simulate delay then show success
      await new Promise((r) => setTimeout(r, 900))
      setView('success')
      setLoading(false)
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setView('success')
    } catch (err) {
      let msg = err instanceof Error ? err.message : 'Gagal memperbarui password. Coba lagi.'
      if (msg.toLowerCase().includes('same password')) {
        msg = 'Password baru tidak boleh sama dengan password lama.'
      }
      setSubmitError(msg)
      setLoading(false)
    }
  }

  const strength = calcStrength(password)

  return (
    <AuthShell>
      <div className="page-fadein">
        <h1 className="font-display text-2xl sm:text-[1.75rem] font-bold text-brown tracking-tight mb-1">
          {view === 'error' ? errorTitle : 'Buat Password Baru'}
        </h1>
        {view === 'form' && (
          <p className="text-brown-3 text-sm mb-4">
            Masukkan password baru untuk akun Anda
            {!isSupabaseConfigured && (
              <span className="ml-2 inline-block text-xs font-semibold text-terra-d bg-terra/10 border border-terra/30 rounded-full px-2 py-0.5 align-middle">
                Demo Mode
              </span>
            )}
          </p>
        )}
        {view === 'error' && errorSub && <p className="text-brown-3 text-sm mb-4">{errorSub}</p>}

        {view === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 min-h-[160px]">
            <div
              className="w-9 h-9 rounded-full border-4 border-brown-3/30 border-t-terra animate-spin"
              aria-hidden="true"
            />
            <p className="text-sm text-brown-3">Memverifikasi token…</p>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={handleSubmit}>
            {!isSupabaseConfigured && (
              <div className="text-sm text-brown-2 bg-bg3 border border-brown-3/20 rounded p-2 mb-3">
                Anda sedang dalam <strong>Demo Mode</strong> — form ditampilkan tanpa verifikasi token.
              </div>
            )}

            {submitError && <div className="text-red mb-3 text-sm">{submitError}</div>}

            <label htmlFor="pw1">Password Baru</label>
            <div className="relative">
              <input
                id="pw1"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Min. 6 karakter"
                value={password}
                onChange={(e) => onPw1Change(e.target.value)}
                className={`w-full border rounded p-2 mb-1 pr-12 ${pw1Error ? 'border-red' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label="Tampilkan password"
                className="absolute right-2 top-1/2 -translate-y-1/2 -mt-1 text-brown-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {showPassword ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>

            <div className="flex gap-1 mb-1" aria-hidden="true">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`flex-1 h-[3px] rounded-sm ${i < strength ? STRENGTH_COLORS[strength] : 'bg-brown-3/20'}`}
                />
              ))}
            </div>
            {pw1Error && <div className="text-red text-xs mb-2">{pw1Error}</div>}

            <label htmlFor="pw2" className="mt-2 block">
              Konfirmasi Password
            </label>
            <div className="relative">
              <input
                id="pw2"
                type={showConfirm ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => onPw2Change(e.target.value)}
                className={`w-full border rounded p-2 mb-1 pr-12 ${pw2Error ? 'border-red' : ''}`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label="Tampilkan konfirmasi"
                className="absolute right-2 top-1/2 -translate-y-1/2 -mt-1 text-brown-3 min-w-[44px] min-h-[44px] flex items-center justify-center"
              >
                {showConfirm ? 'Sembunyikan' : 'Lihat'}
              </button>
            </div>
            {pw2Error && <div className="text-red text-xs mb-2">{pw2Error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-terra text-white rounded-full py-2 font-semibold mt-3"
            >
              {loading ? 'Memproses…' : 'Simpan Password'}
            </button>

            <p className="text-center text-sm text-brown-3 mt-4">
              Ingat password?{' '}
              <Link to="/" className="text-sage-d font-semibold hover:underline">
                Kembali ke Login
              </Link>
            </p>
          </form>
        )}

        {view === 'success' && (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-sage/20 border-2 border-sage flex items-center justify-center text-sage-d">
              <IconCheck size={28} />
            </div>
            <p className="font-bold text-brown">Password Berhasil Diperbarui!</p>
            <p className="text-sm text-brown-3">
              Password baru Anda sudah aktif. Silakan masuk dengan password yang baru.
            </p>
            <Link
              to="/"
              className="w-full bg-terra text-white rounded-full py-2 font-semibold text-center mt-2"
            >
              Kembali ke Login
            </Link>
          </div>
        )}

        {view === 'error' && (
          <div className="flex flex-col items-center gap-3 text-center py-2">
            <div className="w-14 h-14 rounded-full bg-red/10 border-2 border-red/30 flex items-center justify-center text-2xl">
              !
            </div>
            {errorDetail && (
              <div className="text-sm text-red bg-red/10 border border-red/30 rounded p-2 w-full text-left">
                {errorDetail}
              </div>
            )}
            <Link
              to="/"
              className="w-full bg-terra text-white rounded-full py-2 font-semibold text-center mt-2"
            >
              Kembali ke Login
            </Link>
            <p className="text-sm text-brown-3 mt-1">
              Dari halaman login, klik <strong>&quot;Lupa kata sandi?&quot;</strong> untuk minta link baru.
            </p>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
