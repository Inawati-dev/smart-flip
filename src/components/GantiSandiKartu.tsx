import { useState, type FormEvent } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { IconLock } from './icons'
import { PasswordInput } from './PasswordInput'

const BORDER = { borderColor: 'var(--border)' } as const
const MIN = 8
const MAKS = 72 // bcrypt hanya memakai 72 byte pertama

/** Galat isian sandi baru, atau '' bila sah. */
export function galatSandiBaru(sandi: string, ulang: string): string {
  if (sandi.length < MIN || !sandi.trim()) return `Kata sandi minimal ${MIN} karakter dan tidak boleh hanya spasi.`
  if (new TextEncoder().encode(sandi).length > MAKS) return `Kata sandi terlalu panjang: paling banyak ${MAKS} byte (huruf beraksen dan emoji memakai lebih dari 1 byte).`
  if (sandi !== ulang) return 'Kedua isian kata sandi belum sama.'
  return ''
}

/** Pesan galat Supabase Auth dalam bahasa Indonesia; pesan lain diteruskan apa adanya. */
export function pesanGalatSandi(err: unknown): string {
  const e = (err ?? {}) as { code?: string; message?: string }
  const m = (e.message ?? '').toLowerCase()
  if (e.code === 'same_password' || m.includes('different from the old password') || m.includes('same password')) return 'Kata sandi baru sama dengan yang lama.'
  if (m.includes('session') || m.includes('reauthenticat')) return 'Sesi masuk sudah habis. Keluar, masuk lagi, lalu ulangi.'
  if (m.includes('failed to fetch') || m.includes('network')) return 'Tidak ada koneksi. Periksa internet lalu coba lagi.'
  return e.message || 'Gagal mengganti kata sandi.'
}

// Antrean #248: pengguna yang sedang masuk mengganti kata sandinya sendiri,
// terutama mahasiswa yang menerima sandi sementara dari dosen (antrean #246),
// karena tautan "Lupa Kata Sandi" butuh email asli.
export function GantiSandiKartu() {
  const [buka, setBuka] = useState(false)
  const [sandi, setSandi] = useState('')
  const [ulang, setUlang] = useState('')
  const [galat, setGalat] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [selesai, setSelesai] = useState(false)

  function tutup() {
    setBuka(false)
    setSandi('') // sandi tidak disimpan di mana pun sesudah modal ditutup
    setUlang('')
    setGalat('')
    setSelesai(false)
  }
  async function simpan(e: FormEvent) {
    e.preventDefault()
    if (menyimpan) return // cegah kirim ganda lewat Enter
    const g = galatSandiBaru(sandi, ulang)
    if (g) return setGalat(g)
    setMenyimpan(true)
    setGalat('')
    try {
      const { error } = await supabase.auth.updateUser({ password: sandi })
      if (error) throw error
      setSandi('')
      setUlang('')
      setSelesai(true)
    } catch (err) {
      setGalat(pesanGalatSandi(err))
    } finally {
      setMenyimpan(false)
    }
  }

  return (
    <div className="bg-ivory rounded-2xl border p-5 flex flex-col" style={BORDER}>
      <div className="flex items-center gap-2.5 mb-1">
        <IconLock size={18} className="text-brown-3" />
        <span className="text-sm font-semibold text-brown">Kata Sandi</span>
      </div>
      <p className="text-xs text-brown-3 mb-3">
        {isSupabaseConfigured
          ? 'Ganti kata sandi akun Anda, misalnya sesudah menerima kata sandi sementara dari dosen.'
          : 'Mengganti kata sandi tidak tersedia pada mode demo.'}
      </p>
      <button type="button" onClick={() => setBuka(true)} disabled={!isSupabaseConfigured} className="btn btn-secondary self-start">
        Ganti Kata Sandi
      </button>

      {buka && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
          onKeyDown={(e) => { if (e.key === 'Escape' && !menyimpan) tutup() }}
        >
          <form
            onSubmit={(e) => void simpan(e)}
            className="bg-ivory rounded-2xl modal-sempit p-6 flex flex-col gap-3"
            style={{ animation: 'slideUpModal 0.22s ease' }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-ganti-sandi"
          >
            <h3 id="judul-ganti-sandi" className="text-base font-semibold text-brown">Ganti Kata Sandi</h3>
            {selesai ? (
              <>
                <p className="text-sm text-brown-2 leading-relaxed">Kata sandi baru sudah disimpan. Pakai kata sandi ini saat masuk berikutnya.</p>
                <button type="button" onClick={tutup} className="btn btn-primary">Tutup</button>
              </>
            ) : (
              <>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-brown-2">
                  Kata sandi baru
                  <PasswordInput
                    value={sandi}
                    onChange={(e) => setSandi(e.target.value)}
                    minLength={MIN}
                    maxLength={MAKS}
                    autoComplete="new-password"
                    autoFocus
                    className="w-full h-11 rounded-[var(--radius-control)] border px-3 text-base font-normal text-brown"
                    style={BORDER}
                  />
                </label>
                <label className="flex flex-col gap-1.5 text-sm font-medium text-brown-2">
                  Ulangi kata sandi baru
                  <PasswordInput
                    value={ulang}
                    onChange={(e) => setUlang(e.target.value)}
                    maxLength={MAKS}
                    autoComplete="new-password"
                    className="w-full h-11 rounded-[var(--radius-control)] border px-3 text-base font-normal text-brown"
                    style={BORDER}
                  />
                </label>
                <p className="text-[13px] text-brown-3">Minimal {MIN} karakter.</p>
                {galat && <p role="alert" className="text-sm text-red">{galat}</p>}
                <div className="flex gap-2.5">
                  <button type="button" onClick={tutup} disabled={menyimpan} className="btn btn-secondary flex-1">Batal</button>
                  <button type="submit" disabled={menyimpan || !sandi || !ulang} className="btn btn-primary flex-1">
                    {menyimpan ? 'Menyimpan…' : 'Simpan'}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      )}
    </div>
  )
}
