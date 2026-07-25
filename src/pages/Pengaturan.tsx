import { useState } from 'react'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import { useStudentStats } from '../hooks/useAnalitik'
import { computeNeedsAttentionStudents } from '../lib/analitik'
import { IconCompass, IconBell, IconCheck } from '../components/icons'
import { injectDesignTokens } from '../lib/design-tokens'
import { THEMES, getTheme, setTheme, type ThemeId } from '../lib/theme'

const BORDER = { borderColor: 'var(--border)' } as const

export function Pengaturan() {
  const { role } = useAuth()
  const isDosen = role === 'dosen'
  const [active, setActive] = useState<ThemeId>(() => getTheme())
  const { data: students } = useStudentStats()
  const needsAttention = isDosen && students ? computeNeedsAttentionStudents(students) : []

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
    </Layout>
  )
}

export default Pengaturan
