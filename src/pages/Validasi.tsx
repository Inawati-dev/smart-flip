import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useValidasi } from '../hooks/useValidasi'
import {
  LABEL_MEDIA,
  LABEL_MATERI,
  SCALE_LABELS,
  kelayakanInfo,
  computeValidasiResult,
  barColor,
  skorClass,
  saveValidasi,
  type ValidasiData,
} from '../lib/validasi'
import { printValidasiPdf } from '../lib/reportPdf'
import { Layout } from '../components/Layout'
import { IconPrinter } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const

type Aspect = 'media' | 'materi'

const SKOR_COLOR: Record<ReturnType<typeof skorClass>, string> = {
  good: 'var(--sage-d)',
  avg: 'var(--terra-d)',
  low: 'var(--red)',
}

function emptyScores(): number[] {
  return Array(8).fill(0)
}

function IndikatorRow({
  num,
  label,
  aspect,
  value,
  onChange,
}: {
  num: number
  label: string
  aspect: Aspect
  value: number
  onChange: (val: number) => void
}) {
  return (
    <div className="flex flex-col md:flex-row md:items-center gap-3 py-3.5 border-b last:border-b-0" style={BORDER}>
      <div className="flex-1 min-w-0 flex items-start gap-2">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[.65rem] font-bold flex-shrink-0 mt-0.5"
          style={{ background: 'rgba(212,163,115,.15)', color: 'var(--terra)' }}
        >
          {num}
        </span>
        <span className="text-sm font-semibold text-brown leading-snug">{label}</span>
      </div>
      <div className="flex flex-col items-start md:items-end gap-1.5 flex-shrink-0">
        <div role="radiogroup" aria-label={label} className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((val) => (
            <label key={val} className="flex flex-col items-center gap-0.5 cursor-pointer select-none">
              <input
                type="radio"
                name={`ind_${aspect}_${num}`}
                value={val}
                checked={value === val}
                onChange={() => onChange(val)}
                aria-label={`${val} — ${SCALE_LABELS[val - 1]}`}
                className="sr-only"
              />
              <span
                title={SCALE_LABELS[val - 1]}
                className={`w-11 h-11 md:w-9 md:h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-colors ${
                  value === val ? 'text-white' : 'text-brown-3'
                }`}
                style={{
                  borderColor: value === val ? 'var(--terra)' : 'var(--border)',
                  background: value === val ? 'var(--terra)' : 'var(--bg3)',
                }}
              >
                {val}
              </span>
            </label>
          ))}
        </div>
        <div
          className={`text-xs font-bold rounded-full px-2 py-0.5 min-w-[2.5rem] text-center border ${
            value > 0 ? 'bg-terra border-terra text-white' : 'text-brown-3 bg-[color:var(--bg3)]'
          }`}
          style={value > 0 ? undefined : BORDER}
        >
          {value > 0 ? `${value}/5` : '—'}
        </div>
      </div>
    </div>
  )
}

export function Validasi() {
  const { profile } = useAuth()
  const queryClient = useQueryClient()
  const { data: existing } = useValidasi()

  const [nama, setNama] = useState('')
  const [institusi, setInstitusi] = useState('')
  const [keahlian, setKeahlian] = useState('')

  const [scoresM, setScoresM] = useState<number[]>(emptyScores)
  const [scoresT, setScoresT] = useState<number[]>(emptyScores)
  const [saranMedia, setSaranMedia] = useState('')
  const [saranMateri, setSaranMateri] = useState('')

  const [activeTab, setActiveTab] = useState<Aspect>('media')
  const [errNama, setErrNama] = useState(false)
  const [errInstitusi, setErrInstitusi] = useState(false)
  const [errKeahlian, setErrKeahlian] = useState(false)
  const [errMedia, setErrMedia] = useState(false)
  const [errMateri, setErrMateri] = useState(false)
  const [errSubmit, setErrSubmit] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [riwayatOpen, setRiwayatOpen] = useState(false)

  // localResult holds a freshly-submitted payload (so the result view can
  // render immediately without waiting on a query refetch). formForced is
  // set by "Isi Ulang" to show the form again without touching the saved
  // record — mirrors legacy/validasi.html's isiUlang(), which never clears
  // storage, it just flips the form/hasil visibility.
  const [localResult, setLocalResult] = useState<ValidasiData | null>(null)
  const [formForced, setFormForced] = useState(false)

  // Computed at render time (not in an effect) so SSR and the very first
  // client render agree: if a validasi already exists (or was just
  // submitted) and the user hasn't asked to redo it, show the result view —
  // mirrors legacy/validasi.html's checkRiwayat().
  const displayedResult = localResult ?? existing ?? null
  const viewMode: 'form' | 'result' = formForced || !displayedResult ? 'form' : 'result'
  const result = displayedResult

  // Pre-fill nama from the signed-in profile — mirrors legacy/validasi.html's
  // auth guard (fldNama.value = p.full_name) and DataLayer.getProfile() fallback.
  useEffect(() => {
    if (profile?.full_name && !nama) setNama(profile.full_name)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  function setScore(aspect: Aspect, idx: number, val: number) {
    if (aspect === 'media') {
      setScoresM((s) => {
        const next = [...s]
        next[idx] = val
        return next
      })
      setErrMedia(false)
    } else {
      setScoresT((s) => {
        const next = [...s]
        next[idx] = val
        return next
      })
      setErrMateri(false)
    }
  }

  async function handleSubmit() {
    const namaVal = nama.trim()
    const instVal = institusi.trim()
    const keahVal = keahlian.trim()
    const mediaOk = scoresM.every((v) => v > 0)
    const materiOk = scoresT.every((v) => v > 0)

    setErrNama(!namaVal)
    setErrInstitusi(!instVal)
    setErrKeahlian(!keahVal)
    setErrMedia(!mediaOk)
    setErrMateri(!materiOk)

    const valid = !!namaVal && !!instVal && !!keahVal && mediaOk && materiOk
    setErrSubmit(!valid)
    if (!valid) {
      if (!mediaOk) setActiveTab('media')
      return
    }

    setSubmitting(true)
    try {
      const { avgMedia, avgMateri, totalAvg } = computeValidasiResult(scoresM, scoresT)
      const payload: ValidasiData = {
        aspekMedia: { scores: [...scoresM], avg: avgMedia, komentar: saranMedia.trim() },
        aspekMateri: { scores: [...scoresT], avg: avgMateri, komentar: saranMateri.trim() },
        totalAvg,
        validator: { nama: namaVal, institusi: instVal, keahlian: keahVal },
        timestamp: Date.now(),
      }
      await saveValidasi(payload)
      showToast('Validasi berhasil disimpan. Terima kasih! ✓')
      setLocalResult(payload)
      setFormForced(false)
      await queryClient.invalidateQueries({ queryKey: ['validasi'] })
    } catch {
      showToast('Gagal menyimpan. Coba lagi.')
    } finally {
      setSubmitting(false)
    }
  }

  // isiUlang() — mirrors legacy exactly: resets scores/komentar/errors and
  // shows the form again, but deliberately does NOT clear the saved record
  // (matches legacy/validasi.html's isiUlang(), which never calls a "clear"
  // data-layer method — submitting again simply overwrites it via upsert).
  function isiUlang() {
    setScoresM(emptyScores())
    setScoresT(emptyScores())
    setSaranMedia('')
    setSaranMateri('')
    setErrNama(false)
    setErrInstitusi(false)
    setErrKeahlian(false)
    setErrMedia(false)
    setErrMateri(false)
    setErrSubmit(false)
    setActiveTab('media')
    setFormForced(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 pb-16 print:p-0 print:max-w-full">
        {/* PAGE HEADING */}
        <div className="mb-7 print:hidden">
          <h1 className="font-display text-xl md:text-2xl font-bold text-brown leading-tight">
            Instrumen Validasi Ahli
          </h1>
          <p className="text-sm text-brown-3 mt-1.5">
            Lembar penilaian kelayakan e-modul SMART-FLIP 5.0 untuk validator ahli media dan ahli materi
          </p>
        </div>

        {/* INFO PANEL */}
        <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5 print:hidden" style={BORDER}>
          <div className="font-display text-base font-semibold text-brown mb-4">
            Informasi Instrumen
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-x-6 sm:gap-y-3 mb-4">
            <div className="flex flex-col gap-0.5">
              <span className="text-[.7rem] font-bold uppercase tracking-wide text-brown-3">Nama Instrumen</span>
              <span className="text-sm font-medium text-brown">Lembar Validasi E-Modul SMART-FLIP 5.0</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[.7rem] font-bold uppercase tracking-wide text-brown-3">Tujuan</span>
              <span className="text-sm font-medium text-brown">Penilaian kelayakan aspek media &amp; materi</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[.7rem] font-bold uppercase tracking-wide text-brown-3">Skala Penilaian</span>
              <span className="text-sm font-medium text-brown">1 (Sangat Kurang) — 5 (Sangat Baik)</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[.7rem] font-bold uppercase tracking-wide text-brown-3">Aspek Dinilai</span>
              <span className="text-sm font-medium text-brown">Media (8 indikator) + Materi (8 indikator)</span>
            </div>
          </div>
          <div
            className="text-sm text-brown-2 rounded-r-lg px-3.5 py-2.5 leading-relaxed"
            style={{ background: 'var(--bg3)', borderLeft: '3px solid var(--terra)' }}
          >
            <strong>Petunjuk pengisian:</strong> Pilih angka 1–5 pada setiap indikator sesuai dengan penilaian Anda.
            Nilai 1 = Sangat Kurang, 2 = Kurang, 3 = Cukup, 4 = Baik, 5 = Sangat Baik. Isi semua indikator sebelum
            mengirimkan formulir. Saran dan komentar sangat membantu perbaikan e-modul ini.
          </div>
        </div>

        {/* ══════ FORM ══════ */}
        {viewMode === 'form' && (
          <div>
            {/* IDENTITAS VALIDATOR */}
            <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5" style={BORDER}>
              <div className="font-display text-base font-semibold text-brown mb-4">
                Identitas Validator
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-1.5" htmlFor="fldNama">
                    Nama Lengkap <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">wajib</span>
                  </label>
                  <input
                    id="fldNama"
                    type="text"
                    autoComplete="name"
                    placeholder="Dr. / Prof. …"
                    value={nama}
                    onChange={(e) => {
                      setNama(e.target.value)
                      if (errNama) setErrNama(false)
                    }}
                    className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-[color:var(--bg3)] text-sm text-brown outline-none"
                    style={{ borderColor: errNama ? 'var(--red)' : 'var(--border)' }}
                  />
                  {errNama && (
                    <div className="text-xs text-red mt-1.5 px-2.5 py-1.5 rounded-md bg-red/10">
                      Nama lengkap harus diisi.
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-1.5" htmlFor="fldInstitusi">
                    Institusi <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">wajib</span>
                  </label>
                  <input
                    id="fldInstitusi"
                    type="text"
                    autoComplete="organization"
                    placeholder="Universitas / Lembaga …"
                    value={institusi}
                    onChange={(e) => {
                      setInstitusi(e.target.value)
                      if (errInstitusi) setErrInstitusi(false)
                    }}
                    className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-[color:var(--bg3)] text-sm text-brown outline-none"
                    style={{ borderColor: errInstitusi ? 'var(--red)' : 'var(--border)' }}
                  />
                  {errInstitusi && (
                    <div className="text-xs text-red mt-1.5 px-2.5 py-1.5 rounded-md bg-red/10">
                      Institusi harus diisi.
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-1.5" htmlFor="fldKeahlian">
                  Bidang Keahlian <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">wajib</span>
                </label>
                <input
                  id="fldKeahlian"
                  type="text"
                  placeholder="Mis: Teknologi Pendidikan, Desain Grafis, Metodologi Penelitian …"
                  value={keahlian}
                  onChange={(e) => {
                    setKeahlian(e.target.value)
                    if (errKeahlian) setErrKeahlian(false)
                  }}
                  className="w-full h-11 px-3.5 rounded-[10px] border-[1.5px] bg-[color:var(--bg3)] text-sm text-brown outline-none"
                  style={{ borderColor: errKeahlian ? 'var(--red)' : 'var(--border)' }}
                />
                {errKeahlian && (
                  <div className="text-xs text-red mt-1.5 px-2.5 py-1.5 rounded-md bg-red/10">
                    Bidang keahlian harus diisi.
                  </div>
                )}
              </div>
            </div>

            {/* TAB NAV */}
            <div
              className="flex gap-1 mb-5 rounded-xl p-1"
              role="tablist"
              style={{ background: 'var(--bg3)', border: '1px solid var(--border)' }}
            >
              {(
                [
                  { key: 'media', label: 'Aspek Media', count: 8 },
                  { key: 'materi', label: 'Aspek Materi', count: 8 },
                ] as const
              ).map((t) => (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 h-11 rounded-[9px] text-sm font-medium flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    activeTab === t.key ? 'bg-ivory text-terra font-semibold' : 'text-brown-3'
                  }`}
                >
                  {t.label}
                  <span
                    className="text-[.68rem] font-bold rounded-full px-1.5"
                    style={
                      t.key === 'media'
                        ? { background: 'rgba(212,163,115,.2)', color: 'var(--terra)' }
                        : { background: 'rgba(143,162,135,.2)', color: 'var(--sage-d)' }
                    }
                  >
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* ASPEK MEDIA */}
            <div className={activeTab === 'media' ? 'block' : 'hidden'}>
              <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5" style={BORDER}>
                <div className="text-xs font-bold uppercase tracking-wide text-brown-3 mb-3 pb-2 border-b" style={BORDER}>
                  Aspek Media — penilaian kualitas tampilan &amp; antarmuka
                </div>
                {errMedia && (
                  <div className="text-xs text-red mb-2.5 px-2.5 py-1.5 rounded-md bg-red/10">
                    Semua indikator aspek media harus diberi nilai.
                  </div>
                )}
                {LABEL_MEDIA.map((label, i) => (
                  <IndikatorRow
                    key={i}
                    num={i + 1}
                    label={label}
                    aspect="media"
                    value={scoresM[i]}
                    onChange={(v) => setScore('media', i, v)}
                  />
                ))}
                <div className="mt-5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-1.5" htmlFor="saranMedia">
                    Saran &amp; Komentar Aspek Media{' '}
                    <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">opsional, maks. 500 karakter</span>
                  </label>
                  <textarea
                    id="saranMedia"
                    value={saranMedia}
                    onChange={(e) => setSaranMedia(e.target.value.slice(0, 500))}
                    maxLength={500}
                    placeholder="Tuliskan catatan, saran perbaikan, atau komentar untuk aspek media…"
                    className="w-full min-h-[90px] p-3 rounded-[10px] border-[1.5px] bg-[color:var(--bg3)] text-sm text-brown outline-none resize-y leading-relaxed"
                    style={BORDER}
                  />
                  <div className={`text-xs text-right mt-1 ${saranMedia.length >= 450 ? 'text-red' : 'text-brown-3'}`}>
                    {saranMedia.length} / 500
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('materi')}
                  className="w-full h-[50px] mt-4 rounded-xl bg-terra-d text-white text-sm font-semibold cursor-pointer flex items-center justify-center gap-2"
                >
                  Lanjut ke Aspek Materi →
                </button>
              </div>
            </div>

            {/* ASPEK MATERI */}
            <div className={activeTab === 'materi' ? 'block' : 'hidden'}>
              <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5" style={BORDER}>
                <div className="text-xs font-bold uppercase tracking-wide text-brown-3 mb-3 pb-2 border-b" style={BORDER}>
                  Aspek Materi — penilaian kualitas konten &amp; pembelajaran
                </div>
                {errMateri && (
                  <div className="text-xs text-red mb-2.5 px-2.5 py-1.5 rounded-md bg-red/10">
                    Semua indikator aspek materi harus diberi nilai.
                  </div>
                )}
                {LABEL_MATERI.map((label, i) => (
                  <IndikatorRow
                    key={i}
                    num={i + 1}
                    label={label}
                    aspect="materi"
                    value={scoresT[i]}
                    onChange={(v) => setScore('materi', i, v)}
                  />
                ))}
                <div className="mt-5">
                  <label className="block text-xs font-semibold uppercase tracking-wide text-brown-2 mb-1.5" htmlFor="saranMateri">
                    Saran &amp; Komentar Aspek Materi{' '}
                    <span className="normal-case tracking-normal font-normal text-brown-3 ml-1">opsional, maks. 500 karakter</span>
                  </label>
                  <textarea
                    id="saranMateri"
                    value={saranMateri}
                    onChange={(e) => setSaranMateri(e.target.value.slice(0, 500))}
                    maxLength={500}
                    placeholder="Tuliskan catatan, saran perbaikan, atau komentar untuk aspek materi…"
                    className="w-full min-h-[90px] p-3 rounded-[10px] border-[1.5px] bg-[color:var(--bg3)] text-sm text-brown outline-none resize-y leading-relaxed"
                    style={BORDER}
                  />
                  <div className={`text-xs text-right mt-1 ${saranMateri.length >= 450 ? 'text-red' : 'text-brown-3'}`}>
                    {saranMateri.length} / 500
                  </div>
                </div>

                {errSubmit && (
                  <div className="text-xs text-red mt-4 px-2.5 py-1.5 rounded-md bg-red/10">
                    Harap lengkapi semua indikator dan identitas validator sebelum mengirimkan.
                  </div>
                )}
                <button
                  onClick={() => void handleSubmit()}
                  disabled={submitting}
                  className="w-full h-[50px] mt-4 rounded-xl bg-terra-d text-white text-sm font-semibold disabled:opacity-55 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                >
                  {submitting ? 'Menyimpan…' : 'Kirim Validasi'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════ HASIL VALIDASI ══════ */}
        {viewMode === 'result' && result && (
          <div>
            <div className="bg-ivory rounded-2xl border p-5 md:p-7 mb-5 print:border-black" style={BORDER}>
              <div className="font-display text-base font-semibold text-brown mb-4">Hasil Validasi</div>

              {(() => {
                const ki = kelayakanInfo(result.totalAvg)
                const badgeStyle =
                  ki.key === 'sangat-layak'
                    ? { background: '#C0DD97', color: '#27500A' }
                    : ki.key === 'layak'
                      ? { background: 'rgba(212,163,115,.25)', color: '#7A4A10' }
                      : ki.key === 'cukup-layak'
                        ? { background: '#F5E8CB', color: '#7A5A10' }
                        : { background: 'var(--red-bg, #FDECEA)', color: 'var(--red)' }
                return (
                  <span
                    className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold mb-5"
                    style={badgeStyle}
                  >
                    {ki.icon} {ki.label} — Rata-rata {result.totalAvg}
                  </span>
                )
              })()}

              <div className="mb-5">
                <div className="text-sm text-brown-3 mb-1">Rata-rata Total (Media + Materi)</div>
                <div className="text-3xl font-bold text-brown leading-none">{result.totalAvg}</div>
                <div className="text-xs text-brown-3 mt-1">dari skala 5.00</div>
              </div>

              {/* Aspect summary bars */}
              <div className="mb-5">
                {[
                  { label: 'Aspek Media', avg: result.aspekMedia.avg },
                  { label: 'Aspek Materi', avg: result.aspekMateri.avg },
                ].map((a) => (
                  <div key={a.label} className="flex items-center gap-3 py-2 border-b last:border-b-0" style={BORDER}>
                    <div className="text-sm text-brown-2 font-medium flex-none w-[110px] sm:w-[130px]">{a.label}</div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }}>
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{ width: `${(a.avg / 5) * 100}%`, background: barColor(a.avg) }}
                      />
                    </div>
                    <div className="text-sm font-bold text-brown flex-none w-10 text-right">{a.avg}</div>
                  </div>
                ))}
              </div>

              {/* Ringkasan table */}
              <div className="overflow-x-auto mb-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3 w-10" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        No
                      </th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-brown-3" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        Indikator
                      </th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-brown-3 w-20" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        Aspek
                      </th>
                      <th className="text-center px-3 py-2 text-xs font-semibold text-brown-3 w-20" style={{ background: 'var(--bg3)', borderBottom: '1px solid var(--border)' }}>
                        Nilai
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.aspekMedia.scores.map((v, i) => (
                      <tr key={`m${i}`}>
                        <td className="px-3 py-2 text-brown-2 border-b" style={BORDER}>
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 text-brown-2 border-b" style={BORDER}>
                          {LABEL_MEDIA[i]}
                        </td>
                        <td className="px-3 py-2 text-center text-xs border-b" style={{ ...BORDER, color: 'var(--terra)' }}>
                          Media
                        </td>
                        <td className="px-3 py-2 text-center font-bold border-b" style={{ ...BORDER, color: SKOR_COLOR[skorClass(v)] }}>
                          {v}/5
                        </td>
                      </tr>
                    ))}
                    {result.aspekMateri.scores.map((v, i) => (
                      <tr key={`t${i}`}>
                        <td className="px-3 py-2 text-brown-2 border-b" style={BORDER}>
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 text-brown-2 border-b" style={BORDER}>
                          {LABEL_MATERI[i]}
                        </td>
                        <td className="px-3 py-2 text-center text-xs border-b" style={{ ...BORDER, color: 'var(--sage-d)' }}>
                          Materi
                        </td>
                        <td className="px-3 py-2 text-center font-bold border-b" style={{ ...BORDER, color: SKOR_COLOR[skorClass(v)] }}>
                          {v}/5
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: 'var(--bg3)' }}>
                      <td colSpan={3} className="px-3 py-2 text-right font-bold text-brown" style={{ borderTop: '2px solid var(--border)' }}>
                        Rata-rata Total
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-brown" style={{ borderTop: '2px solid var(--border)' }}>
                        {result.totalAvg}/5
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {(result.aspekMedia.komentar || result.aspekMateri.komentar) && (
                <div className="flex flex-col gap-2 mb-1">
                  {result.aspekMedia.komentar && (
                    <div className="text-xs text-brown-2 p-2.5 rounded-lg leading-relaxed" style={{ background: 'var(--bg3)' }}>
                      <strong>Media:</strong> &quot;{result.aspekMedia.komentar}&quot;
                    </div>
                  )}
                  {result.aspekMateri.komentar && (
                    <div className="text-xs text-brown-2 p-2.5 rounded-lg leading-relaxed" style={{ background: 'var(--bg3)' }}>
                      <strong>Materi:</strong> &quot;{result.aspekMateri.komentar}&quot;
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-3 mt-5 print:hidden">
                <button
                  onClick={() => printValidasiPdf(result)}
                  className="flex-1 h-11 rounded-[10px] border-[1.5px] text-sm font-medium text-brown-2 cursor-pointer flex items-center justify-center gap-1.5"
                  style={BORDER}
                >
                  <IconPrinter size={16} /> Cetak Hasil
                </button>
                <button
                  onClick={isiUlang}
                  className="flex-1 h-11 rounded-[10px] border-none text-sm font-semibold cursor-pointer flex items-center justify-center gap-1.5"
                  style={{ background: 'var(--brown)', color: 'var(--terra)' }}
                >
                  ↺ Isi Ulang
                </button>
              </div>
            </div>

            {/* RIWAYAT */}
            <div className="print:hidden">
              <button
                onClick={() => setRiwayatOpen((o) => !o)}
                aria-expanded={riwayatOpen}
                className="w-full flex items-center justify-between bg-ivory border rounded-xl px-4 py-3.5 text-sm font-semibold text-brown-2 cursor-pointer"
                style={BORDER}
              >
                <span>
                  Riwayat Validasi
                  <span className="text-xs font-normal text-brown-3 ml-1">(1)</span>
                </span>
                <span
                  className="text-brown-3 text-xs inline-block transition-transform"
                  style={{ transform: riwayatOpen ? 'rotate(180deg)' : undefined }}
                >
                  ▼
                </span>
              </button>
              {riwayatOpen && (
                <div className="bg-ivory border rounded-xl p-4 mt-3" style={BORDER}>
                  <div className="flex justify-between items-start gap-2 mb-3">
                    <div>
                      <div className="text-sm font-semibold text-brown">
                        {result.validator.nama} — {result.validator.institusi}
                      </div>
                      <div className="text-xs text-brown-3 mt-0.5">{result.validator.keahlian}</div>
                    </div>
                    <div className="text-xs text-brown-3 whitespace-nowrap flex-shrink-0">
                      {result.timestamp
                        ? new Date(result.timestamp).toLocaleDateString('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </div>
                  </div>
                  <div className="flex gap-4 flex-wrap mb-2.5 text-sm text-brown-2">
                    <div>
                      Media: <strong style={{ color: 'var(--terra)' }}>{result.aspekMedia.avg}</strong>
                    </div>
                    <div>
                      Materi: <strong style={{ color: 'var(--sage-d)' }}>{result.aspekMateri.avg}</strong>
                    </div>
                    <div>
                      Total: <strong className="text-brown">{result.totalAvg}</strong>
                    </div>
                  </div>
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
                    style={{ background: 'var(--sage)', color: 'var(--sage-d)', opacity: 0.9 }}
                  >
                    {kelayakanInfo(result.totalAvg).icon} {kelayakanInfo(result.totalAvg).label}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] whitespace-nowrap print:hidden"
          style={{ background: 'var(--brown)', color: '#fff', boxShadow: '0 4px 16px rgba(62,54,46,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

export default Validasi
