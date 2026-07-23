import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useModules } from '../hooks/useModules'
import { useFeedback } from '../hooks/useFeedback'
import { saveFeedback, computeRataRata, type FeedbackRatings } from '../lib/feedback'
import { Layout } from '../components/Layout'
import { IconClipboard, IconStar } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

const ASPECTS: Array<{ key: keyof FeedbackRatings; name: string; desc: string }> = [
  { key: 'konten', name: 'Kualitas Konten', desc: 'Kelengkapan dan kedalaman materi' },
  { key: 'kemudahan', name: 'Kemudahan Penggunaan', desc: 'Navigasi antarmuka dan tampilan' },
  { key: 'keterbacaan', name: 'Keterbacaan', desc: 'Ukuran font, warna, dan layout' },
  { key: 'kebermanfaatan', name: 'Kebermanfaatan', desc: 'Relevansi dengan tujuan belajar' },
]

const EMPTY_RATINGS: FeedbackRatings = { konten: 0, kemudahan: 0, keterbacaan: 0, kebermanfaatan: 0 }

function starsHtml(n: number): string {
  const v = Math.max(0, Math.min(5, n))
  return '★'.repeat(v) + '☆'.repeat(5 - v)
}

export function Feedback() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: modules = [] } = useModules()

  const [selectedModuleId, setSelectedModuleId] = useState<number | null>(null)
  const [ratings, setRatings] = useState<FeedbackRatings>(EMPTY_RATINGS)
  const [hovered, setHovered] = useState<{ aspect: keyof FeedbackRatings; val: number } | null>(null)
  const [komentar, setKomentar] = useState('')
  const [errModul, setErrModul] = useState(false)
  const [errRating, setErrRating] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [riwayatOpen, setRiwayatOpen] = useState(false)

  const viewerRole = profile?.role ?? null
  const { data: feedbacks = [], isLoading } = useFeedback(selectedModuleId, viewerRole)

  const allRatingsFilled = Object.values(ratings).every((v) => v > 0)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  function setRating(aspect: keyof FeedbackRatings, val: number) {
    setRatings((r) => ({ ...r, [aspect]: val }))
    if (errRating) setErrRating(false)
  }

  async function refetchFeedback() {
    await queryClient.invalidateQueries({ queryKey: ['feedback'] })
  }

  async function handleSubmit() {
    const modValid = !!selectedModuleId
    const ratingValid = allRatingsFilled
    setErrModul(!modValid)
    setErrRating(!ratingValid)
    if (!modValid || !ratingValid) return

    setSubmitting(true)
    try {
      await saveFeedback(selectedModuleId!, { ...ratings, komentar: komentar.trim() })
      showToast('Penilaian berhasil disimpan! Terima kasih. ✓')
      setRatings(EMPTY_RATINGS)
      setKomentar('')
      await refetchFeedback()
      setRiwayatOpen(true)
    } catch {
      showToast('Gagal menyimpan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      <div className="page-fadein max-w-[640px] mx-auto p-4 md:p-6 pb-16">
        <div className="text-center mb-7">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-brown leading-tight">
            Penilaian Kepraktisan Modul
          </h1>
          <p className="text-sm text-brown-3 mt-1.5">
            Berikan penilaian jujur untuk membantu pengembangan materi yang lebih baik
          </p>
        </div>

        {/* FORM CARD */}
        <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5" style={BORDER}>
          {/* PILIH MODUL */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-2">
              Pilih Modul <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">wajib</span>
            </label>
            <select
              value={selectedModuleId ?? ''}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null
                setSelectedModuleId(v)
                if (v) setErrModul(false)
              }}
              className={`w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-[var(--bg3)] text-sm text-brown cursor-pointer outline-none ${
                errModul ? 'outline outline-2 outline-red/30 outline-offset-2' : ''
              }`}
              style={{ borderColor: errModul ? 'var(--red)' : 'var(--border)' }}
            >
              <option value="">— Pilih modul yang ingin dinilai —</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  Modul {m.id} — {m.title}
                </option>
              ))}
            </select>
            {errModul && (
              <div className="text-xs text-red mt-1.5 px-2.5 py-1.5 rounded-md bg-red/10">
                Silakan pilih modul terlebih dahulu.
              </div>
            )}
          </div>

          {/* RATING ASPEK */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-2">
              Rating per Aspek{' '}
              <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">
                klik bintang untuk memberi nilai 1–5
              </span>
            </label>
            {errRating && (
              <div className="text-xs text-red mb-2 px-2.5 py-1.5 rounded-md bg-red/10">
                Semua aspek harus diberi nilai.
              </div>
            )}

            {ASPECTS.map((a, i) => {
              const value = ratings[a.key]
              const previewVal = hovered && hovered.aspect === a.key ? hovered.val : value
              return (
                <div
                  key={a.key}
                  className={`flex items-start gap-4 py-3.5 ${i < ASPECTS.length - 1 ? 'border-b' : ''}`}
                  style={BORDER}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-brown leading-tight">{a.name}</div>
                    <div className="text-xs text-brown-3 mt-0.5">{a.desc}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div role="radiogroup" aria-label={a.name} className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((val) => (
                        <span
                          key={val}
                          role="radio"
                          aria-checked={value === val}
                          aria-label={`${val} bintang`}
                          tabIndex={0}
                          onClick={() => setRating(a.key, val)}
                          onMouseEnter={() => setHovered({ aspect: a.key, val })}
                          onMouseLeave={() => setHovered(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault()
                              setRating(a.key, val)
                            }
                          }}
                          className="text-[1.9rem] md:text-[2rem] leading-none cursor-pointer select-none w-11 h-11 inline-flex items-center justify-center"
                          style={{ color: val <= previewVal ? 'var(--terra)' : 'var(--brown4)' }}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <div
                      className={`text-xs font-bold rounded-full px-2 py-0.5 min-w-[2.4rem] text-center border ${
                        value > 0 ? 'bg-terra border-terra text-white' : 'text-brown-3 bg-[var(--bg3)]'
                      }`}
                      style={value > 0 ? undefined : BORDER}
                    >
                      {value > 0 ? `${value}/5` : '—'}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* KOMENTAR */}
          <div className="mb-6">
            <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-2">
              Komentar{' '}
              <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">
                opsional, maks. 500 karakter
              </span>
            </label>
            <textarea
              value={komentar}
              onChange={(e) => setKomentar(e.target.value.slice(0, 500))}
              maxLength={500}
              placeholder="Tuliskan kesan, saran, atau catatan tambahan untuk pengembang modul…"
              className="w-full min-h-[100px] p-3 rounded-[10px] border-[1.5px] bg-[var(--bg3)] text-sm text-brown outline-none resize-y leading-relaxed"
              style={BORDER}
            />
            <div className={`text-xs text-right mt-1.5 ${komentar.length >= 450 ? 'text-red' : 'text-brown-3'}`}>
              {komentar.length} / 500
            </div>
          </div>

          {/* SUBMIT */}
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-terra-d text-white text-sm font-semibold disabled:opacity-55 disabled:cursor-not-allowed"
          >
            {submitting ? 'Menyimpan…' : 'Kirim Penilaian'}
          </button>
        </div>

        {/* RIWAYAT SECTION */}
        <div className="mt-4">
          <button
            onClick={() => setRiwayatOpen((o) => !o)}
            aria-expanded={riwayatOpen}
            className="w-full flex items-center justify-between bg-ivory border rounded-xl px-4 py-3.5 text-sm font-semibold text-brown-2"
            style={BORDER}
          >
            <span>
              Riwayat Penilaian
              {feedbacks.length > 0 && <span className="text-xs font-normal text-brown-3 ml-1">({feedbacks.length})</span>}
            </span>
            <span
              className="text-brown-3 text-xs inline-block transition-transform"
              style={{ transform: riwayatOpen ? 'rotate(180deg)' : undefined }}
            >
              ▼
            </span>
          </button>

          {riwayatOpen && (
            <div className="pt-1">
              {isLoading ? (
                <div className="text-center py-8 text-brown-3 text-sm">Memuat riwayat...</div>
              ) : feedbacks.length === 0 ? (
                <div className="text-center py-8 px-4 text-brown-3 text-sm">
                  <span className="flex justify-center mb-2">
                    <IconClipboard size={28} />
                  </span>
                  Belum ada penilaian yang diberikan{selectedModuleId ? ' untuk modul ini' : ''}.
                </div>
              ) : (
                feedbacks.map((fb) => {
                  const mod = modules.find((m) => m.id === fb.moduleId)
                  const modTitle = mod ? `Modul ${fb.moduleId} — ${mod.title}` : `Modul ${fb.moduleId}`
                  const dateStr = fb.date
                    ? new Date(fb.date).toLocaleDateString('id-ID', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : ''
                  return (
                    <div key={fb.id} className="bg-ivory border rounded-xl p-4 mt-3" style={BORDER}>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="text-sm font-semibold text-brown leading-tight">{modTitle}</div>
                        <div className="text-xs text-brown-3 whitespace-nowrap flex-shrink-0">{dateStr}</div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-2.5 max-[400px]:grid-cols-1">
                        {ASPECTS.map((a) => (
                          <div key={a.key} className="flex justify-between items-center gap-2">
                            <span className="text-xs text-brown-3">{a.name.split(' ')[0] === 'Kualitas' ? 'Konten' : a.name === 'Kebermanfaatan' ? 'Manfaat' : a.name}</span>
                            <span className="text-sm tracking-tighter" style={{ color: 'var(--terra)' }} title={`${fb[a.key]}/5`}>
                              {starsHtml(fb[a.key])}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold bg-sage/15"
                        style={{ color: 'var(--sage-d)' }}
                      >
                        <IconStar size={13} />
                        Rata-rata: <strong>{fb.rataRata ?? computeRataRata(fb)}</strong> / 5
                      </div>
                      {fb.komentar && (
                        <div className="mt-2.5 text-xs text-brown-2 p-2.5 rounded-lg leading-relaxed" style={{ background: 'var(--bg3)' }}>
                          &quot;{fb.komentar}&quot;
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] whitespace-nowrap"
          style={{ background: 'var(--brown)', color: '#fff', boxShadow: '0 4px 16px rgba(62,54,46,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default Feedback
