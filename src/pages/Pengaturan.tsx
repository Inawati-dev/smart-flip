import { useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useStudentStats } from '../hooks/useAnalitik'
import { computeNeedsAttentionStudents } from '../lib/analitik'
import { IconCompass, IconBell, IconCheck, IconLock } from '../components/icons'
import { injectDesignTokens } from '../lib/design-tokens'
import { THEMES, getTheme, setTheme, type ThemeId } from '../lib/theme'
import {
  MIN_INVITE_CODE_LENGTH,
  getDosenInviteCode,
  isInviteCodeLongEnough,
  setDosenInviteCode,
} from '../lib/inviteCode'

const BORDER = { borderColor: 'var(--border)' } as const

export function Pengaturan() {
  const { role } = useAuth()
  const isDosen = role === 'dosen'
  const [active, setActive] = useState<ThemeId>(() => getTheme())
  const { data: students } = useStudentStats()
  const needsAttention = isDosen && students ? computeNeedsAttentionStudents(students) : []

  // ── Kode undangan dosen ──
  // Sengaja tidak diambil otomatis saat halaman dibuka: ini rahasia yang
  // dipakai untuk memberi akses dosen, jadi jangan sampai nongol begitu saja
  // di layar yang mungkin sedang dishare/diproyeksikan. Dosen harus menekan
  // "Tampilkan" dulu.
  const [inviteCode, setInviteCode] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteErr, setInviteErr] = useState('')
  const [inviteMsg, setInviteMsg] = useState('')
  const [editingInvite, setEditingInvite] = useState(false)
  const [inviteDraft, setInviteDraft] = useState('')
  const [savingInvite, setSavingInvite] = useState(false)
  const [confirmInvite, setConfirmInvite] = useState(false)

  async function revealInviteCode() {
    setInviteLoading(true)
    setInviteErr('')
    try {
      setInviteCode((await getDosenInviteCode()) ?? '')
    } catch (e) {
      setInviteErr(
        e instanceof Error && e.message.includes('function')
          ? 'Fitur ini butuh migration v16 dijalankan dulu di Supabase SQL Editor.'
          : 'Gagal memuat kode undangan.',
      )
    } finally {
      setInviteLoading(false)
    }
  }

  async function saveInviteCode() {
    setSavingInvite(true)
    setInviteErr('')
    try {
      await setDosenInviteCode(inviteDraft)
      setInviteCode(inviteDraft.trim())
      setEditingInvite(false)
      setConfirmInvite(false)
      setInviteMsg('Kode undangan diperbarui. Kode lama langsung tidak berlaku.')
      setTimeout(() => setInviteMsg(''), 4000)
    } catch (e) {
      setInviteErr(e instanceof Error ? e.message : 'Gagal menyimpan kode undangan.')
      setConfirmInvite(false)
    } finally {
      setSavingInvite(false)
    }
  }

  function chooseTheme(id: ThemeId) {
    setActive(id)
    setTheme(id)
    injectDesignTokens(THEMES[id].colors)
  }

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-brown mb-1">Pengaturan</h1>
          <p className="text-brown-3 text-sm">Preferensi tampilan &amp; notifikasi akun kamu</p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
            <div className="flex items-center gap-2.5 mb-3">
              <IconCompass size={18} className="text-brown-3" />
              <span className="text-sm font-semibold text-brown">Tema</span>
            </div>
            <p className="text-xs text-brown-3 mb-3">Pilih tema tampilan aplikasi. Perubahan langsung berlaku.</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(Object.keys(THEMES) as ThemeId[]).map((id) => {
                const t = THEMES[id]
                const selected = active === id
                return (
                  <button
                    key={id}
                    onClick={() => chooseTheme(id)}
                    className="relative text-left rounded-xl border-2 p-3 cursor-pointer transition-colors"
                    style={{ borderColor: selected ? t.colors.terra : 'var(--border)', background: t.colors.ivory }}
                  >
                    {selected && (
                      <span
                        className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: t.colors.terra, color: t.colors.ivory }}
                      >
                        <IconCheck size={10} />
                      </span>
                    )}
                    <div className="flex gap-1 mb-2.5">
                      <span className="w-4 h-4 rounded-full border" style={{ background: t.colors.cream, borderColor: t.colors.border }} />
                      <span className="w-4 h-4 rounded-full" style={{ background: t.colors.terra }} />
                      <span className="w-4 h-4 rounded-full" style={{ background: t.colors.brown }} />
                    </div>
                    <div className="text-xs font-bold mb-0.5" style={{ color: t.colors.brown }}>
                      {t.label}
                    </div>
                    <div className="text-[11px] leading-snug" style={{ color: t.colors.brown3 }}>
                      {t.desc}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Kode undangan dosen — hanya untuk dosen. Ini yang diminta calon
              dosen saat mendaftar di halaman Registrasi; tanpa kode yang cocok,
              pendaftaran tetap jadi (tapi turun jadi peran mahasiswa). */}
          {isDosen && (
            <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
              <div className="flex items-center gap-2.5 mb-1">
                <IconLock size={18} className="text-brown-3" />
                <span className="text-sm font-semibold text-brown">Kode Undangan Dosen</span>
              </div>
              <p className="text-xs text-brown-3 mb-3">
                Kode yang harus diisi calon dosen saat mendaftar. Bagikan hanya ke orang yang memang
                berhak dapat akses dosen — siapa pun yang punya kode ini bisa membuat akun dosen.
              </p>

              {inviteCode === null ? (
                <button
                  onClick={() => void revealInviteCode()}
                  disabled={inviteLoading}
                  className="h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2 disabled:opacity-50"
                  style={BORDER}
                >
                  {inviteLoading ? 'Memuat…' : 'Tampilkan kode'}
                </button>
              ) : editingInvite ? (
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={inviteDraft}
                    onChange={(e) => setInviteDraft(e.target.value)}
                    placeholder={`Minimal ${MIN_INVITE_CODE_LENGTH} karakter`}
                    autoComplete="off"
                    className="w-full h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-base text-brown outline-none focus:border-terra font-mono"
                    style={BORDER}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => setConfirmInvite(true)}
                      disabled={!isInviteCodeLongEnough(inviteDraft)}
                      className="h-11 px-4 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                      style={{ background: 'var(--brown)' }}
                    >
                      Simpan kode baru
                    </button>
                    <button
                      onClick={() => {
                        setEditingInvite(false)
                        setInviteErr('')
                      }}
                      className="h-11 px-4 rounded-lg border text-sm text-brown-2"
                      style={BORDER}
                    >
                      Batal
                    </button>
                  </div>
                  {!isInviteCodeLongEnough(inviteDraft) && inviteDraft.length > 0 && (
                    <span className="text-[11px] text-brown-3">
                      Kurang panjang — minimal {MIN_INVITE_CODE_LENGTH} karakter.
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap items-center">
                  <code
                    className="px-3 h-11 inline-flex items-center rounded-lg text-sm text-brown font-mono break-all"
                    style={{ background: 'var(--bg3)' }}
                  >
                    {inviteCode || '(belum diatur)'}
                  </code>
                  <button
                    onClick={() => {
                      setInviteDraft(inviteCode || '')
                      setEditingInvite(true)
                    }}
                    className="h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2"
                    style={BORDER}
                  >
                    Ganti kode
                  </button>
                  <button
                    onClick={() => setInviteCode(null)}
                    className="h-11 px-4 rounded-lg border text-sm text-brown-2"
                    style={BORDER}
                  >
                    Sembunyikan
                  </button>
                </div>
              )}

              {inviteCode === 'GANTI_KODE_INI_SEKARANG' && (
                <p className="text-xs text-red mt-2.5">
                  Ini masih kode bawaan contoh. Ganti sekarang — kode ini ada di berkas migration yang
                  ikut tersimpan di repositori.
                </p>
              )}
              {inviteErr && <p className="text-xs text-red mt-2.5">{inviteErr}</p>}
              {inviteMsg && <p className="text-xs text-sage-d mt-2.5">{inviteMsg}</p>}
            </div>
          )}

          <div className="bg-ivory rounded-2xl border p-5" style={BORDER}>
            <div className="flex items-center gap-2.5 mb-1">
              <IconBell size={18} className="text-brown-3" />
              <span className="text-sm font-semibold text-brown">Notifikasi</span>
            </div>
            {!isDosen ? (
              <p className="text-xs text-brown-3">Segera hadir — atur notifikasi email &amp; in-app di sini.</p>
            ) : needsAttention.length === 0 ? (
              <p className="text-xs text-brown-3 mt-1">
                Semua mahasiswa sudah mulai modul &amp; tes diagnostik. Tidak ada yang perlu ditindaklanjuti.
              </p>
            ) : (
              <>
                <p className="text-xs text-brown-3 mb-3 mt-1">
                  {needsAttention.length} mahasiswa belum mulai modul atau belum tes diagnostik.
                </p>
                <div className="flex flex-col gap-1.5">
                  {needsAttention.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg flex-wrap"
                      style={{ background: 'var(--bg3)' }}
                    >
                      <span className="text-sm text-brown-2">{s.nama}</span>
                      <div className="flex gap-1.5">
                        {s.belumDiagnostik && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-terra/20 text-terra-d whitespace-nowrap">
                            Belum tes diagnostik
                          </span>
                        )}
                        {s.belumModul && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sage/20 text-sage-d whitespace-nowrap">
                            Belum mulai modul
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Konfirmasi ganti kode — sekali diganti, kode lama langsung mati dan
          siapa pun yang sudah terlanjur dikirimi kode lama tidak bisa lagi
          mendaftar sebagai dosen. */}
      {confirmInvite && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingInvite) setConfirmInvite(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown mb-1.5">Ganti kode undangan?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Kode lama langsung tidak berlaku. Calon dosen yang sudah terlanjur menerima kode lama
              harus dikirimi kode baru ini. Akun dosen yang sudah ada tidak terpengaruh.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmInvite(false)}
                disabled={savingInvite}
                className="flex-1 h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void saveInviteCode()}
                disabled={savingInvite}
                className="flex-1 h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--brown)' }}
              >
                {savingInvite ? 'Menyimpan…' : 'Ya, Ganti'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Pengaturan
