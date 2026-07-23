import { useRef, useState } from 'react'
import { Layout } from '../components/Layout'
import {
  computeNGain,
  computeNGainDistribution,
  type NGainCategory,
  type NGainResult,
} from '../lib/ngain'

const BORDER = { borderColor: 'var(--border)' } as const

interface StudentRow {
  id: string
  nama: string
  pre: string
  post: string
}

// Ported verbatim from legacy/ngain.html's dummyData (legacy/ngain.html:530-536).
const DUMMY_STUDENTS: Array<{ nama: string; pre: string; post: string }> = [
  { nama: 'Ahmad Rizki', pre: '55', post: '80' },
  { nama: 'Budi Santoso', pre: '60', post: '85' },
  { nama: 'Citra Dewi', pre: '45', post: '75' },
  { nama: 'Diana Putri', pre: '70', post: '90' },
  { nama: 'Eko Prasetyo', pre: '50', post: '70' },
]

const CATEGORY_LABEL: Record<NGainCategory, string> = {
  tinggi: 'Tinggi',
  sedang: 'Sedang',
  rendah: 'Rendah',
}

const CATEGORY_TEXT_CLASS: Record<NGainCategory, string> = {
  tinggi: 'text-sage-d',
  sedang: 'text-terra-d',
  rendah: 'text-red',
}

const CATEGORY_BAR_CLASS: Record<NGainCategory, string> = {
  tinggi: 'bg-sage',
  sedang: 'bg-terra',
  rendah: 'bg-red',
}

const CATEGORY_BADGE_CLASS: Record<NGainCategory, string> = {
  tinggi: 'bg-sage/20 text-sage-d',
  sedang: 'bg-terra/20 text-terra-d',
  rendah: 'bg-red/10 text-red',
}

function makeRow(id: string, data: { nama?: string; pre?: string; post?: string } = {}): StudentRow {
  return { id, nama: data.nama ?? '', pre: data.pre ?? '', post: data.post ?? '' }
}

function csvEscape(value: string): string {
  return value.replace(/"/g, '""')
}

export default function Ngain() {
  const nextId = useRef(DUMMY_STUDENTS.length)
  const [skorMax, setSkorMax] = useState('100')
  const [jmlMhs, setJmlMhs] = useState('30')
  const [rows, setRows] = useState<StudentRow[]>(() =>
    DUMMY_STUDENTS.map((d, i) => makeRow(String(i), d)),
  )
  // Snapshot of the last "Hitung N-Gain" click — mirrors legacy's behavior of
  // leaving stale values in the N-Gain/Kategori columns until recalculated,
  // rather than recomputing live on every keystroke.
  const [results, setResults] = useState<Record<string, NGainResult> | null>(null)
  const [overMaxIds, setOverMaxIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState<string | null>(null)
  const [resetModalOpen, setResetModalOpen] = useState(false)
  const [deleteRowId, setDeleteRowId] = useState<string | null>(null)

  const max = parseFloat(skorMax) || 100

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3200)
  }

  function addRow() {
    const id = String(nextId.current++)
    setRows((r) => [...r, makeRow(id)])
  }

  function deleteRow(id: string) {
    setRows((r) => r.filter((row) => row.id !== id))
    setResults((prev) => {
      if (!prev) return prev
      const next = { ...prev }
      delete next[id]
      return next
    })
  }

  function updateRow(id: string, field: 'nama' | 'pre' | 'post', value: string) {
    setRows((r) => r.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function hitungSemua() {
    if (!rows.length) {
      showToast('Tambahkan data mahasiswa terlebih dahulu.')
      return
    }
    const nextResults: Record<string, NGainResult> = {}
    const overMax = new Set<string>()
    let hasError = false

    rows.forEach((row) => {
      const pre = parseFloat(row.pre) || 0
      const post = parseFloat(row.post) || 0
      if (pre > max || post > max) {
        overMax.add(row.id)
        hasError = true
      }
      nextResults[row.id] = computeNGain(pre, post, max)
    })

    setResults(nextResults)
    setOverMaxIds(overMax)
    if (hasError) {
      showToast('Perhatian: beberapa skor melebihi skor maksimum yang dikonfigurasi. Harap periksa data.')
    }
  }

  function performReset() {
    nextId.current = DUMMY_STUDENTS.length
    setRows(DUMMY_STUDENTS.map((d, i) => makeRow(String(i), d)))
    setResults(null)
    setOverMaxIds(new Set())
    setResetModalOpen(false)
  }

  function exportCSV() {
    let csv = 'No,Nama Mahasiswa,Pre-Test,Post-Test,N-Gain,Kategori\n'
    rows.forEach((row, i) => {
      const r = results?.[row.id]
      csv += `${i + 1},"${csvEscape(row.nama)}",${row.pre || ''},${row.post || ''},${r ? r.gain.toFixed(3) : ''},${r ? CATEGORY_LABEL[r.category] : ''}\n`
    })
    if (distribution) {
      csv += `\nRata-rata N-Gain Kelas,${distribution.average.toFixed(3)}\n`
      csv += `Kategori Kelas,${CATEGORY_LABEL[distribution.category]}\n`
      csv += `Tinggi,${distribution.tinggi}\n`
      csv += `Sedang,${distribution.sedang}\n`
      csv += `Rendah,${distribution.rendah}\n`
      csv += `Skor Maksimum,${max}\n`
    }
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ngain-sdl-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const distribution =
    results && rows.length ? computeNGainDistribution(rows.map((row) => results[row.id]).filter(Boolean)) : null

  const pctTinggi = distribution && distribution.total ? (distribution.tinggi / distribution.total) * 100 : 0
  const pctSedang = distribution && distribution.total ? (distribution.sedang / distribution.total) * 100 : 0
  const pctRendah = distribution && distribution.total ? (distribution.rendah / distribution.total) * 100 : 0

  return (
    <Layout>
      <div className="max-w-[900px] mx-auto p-4 md:p-6 pb-16">
        {/* PAGE HEADER */}
        <div className="mb-6 pb-4 border-b" style={BORDER}>
          <h1 className="font-['Playfair_Display',serif] text-xl sm:text-2xl font-bold text-brown mb-1">
            N-Gain Calculator SDL
          </h1>
          <p className="text-sm text-brown-3 leading-relaxed">
            Analisis Peningkatan Self-Directed Learning — hitung dan interpretasi N-Gain dari data pre-test dan
            post-test mahasiswa.
          </p>
        </div>

        {/* CONFIG PANEL */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
          <div className="font-['Playfair_Display',serif] text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <span aria-hidden="true">⚙️</span> Konfigurasi
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="skorMax" className="text-xs font-semibold text-brown-2 tracking-wide">
                Skor Maksimum
              </label>
              <input
                id="skorMax"
                type="number"
                min={1}
                max={1000}
                step={1}
                value={skorMax}
                onChange={(e) => setSkorMax(e.target.value)}
                className="h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-base text-brown outline-none focus:border-terra"
                style={BORDER}
              />
              <span className="text-xs text-brown-3">Nilai tertinggi yang bisa diraih (biasanya 100)</span>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="jmlMhs" className="text-xs font-semibold text-brown-2 tracking-wide">
                Jumlah Mahasiswa
              </label>
              <input
                id="jmlMhs"
                type="number"
                min={1}
                max={500}
                step={1}
                value={jmlMhs}
                onChange={(e) => setJmlMhs(e.target.value)}
                className="h-11 px-3 rounded-lg border-[1.5px] bg-[var(--bg3)] text-base text-brown outline-none focus:border-terra"
                style={BORDER}
              />
              <span className="text-xs text-brown-3">Hanya referensi; baris tabel dikelola manual</span>
            </div>
          </div>
        </div>

        {/* INPUT TABLE PANEL */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
          <div className="font-['Playfair_Display',serif] text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <span aria-hidden="true">📊</span> Data Pre-Test &amp; Post-Test
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <span className="text-sm text-brown-3">{rows.length} mahasiswa</span>
            <button
              onClick={addRow}
              className="min-h-11 px-3.5 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
              style={BORDER}
            >
              + Tambah Baris
            </button>
          </div>

          <div className="overflow-x-auto rounded-lg border" style={BORDER}>
            <table className="w-full border-collapse min-w-[620px]">
              <thead className="bg-cream">
                <tr>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase w-10">
                    No
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    Nama Mahasiswa
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    Pre-Test
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    Post-Test
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    N-Gain
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    Kategori
                  </th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-brown-2 tracking-wide uppercase">
                    Hapus
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => {
                  const r = results?.[row.id]
                  const isOverMax = overMaxIds.has(row.id)
                  return (
                    <tr key={row.id} className="border-b last:border-b-0" style={BORDER}>
                      <td className="px-2 py-2 text-center text-sm text-brown-3">{i + 1}</td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={row.nama}
                          placeholder="Nama mahasiswa"
                          autoComplete="off"
                          onChange={(e) => updateRow(row.id, 'nama', e.target.value)}
                          className="w-full min-w-[140px] h-11 px-2.5 rounded-md border-[1.5px] bg-[var(--bg3)] text-base text-brown outline-none focus:border-terra"
                          style={BORDER}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.pre}
                          placeholder="0"
                          min={0}
                          max={1000}
                          step={0.5}
                          onChange={(e) => updateRow(row.id, 'pre', e.target.value)}
                          className="w-full min-w-[70px] h-11 px-2 rounded-md border-[1.5px] bg-[var(--bg3)] text-base text-brown text-center outline-none focus:border-terra"
                          style={{ borderColor: isOverMax ? 'var(--red)' : 'var(--border)' }}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="number"
                          value={row.post}
                          placeholder="0"
                          min={0}
                          max={1000}
                          step={0.5}
                          onChange={(e) => updateRow(row.id, 'post', e.target.value)}
                          className="w-full min-w-[70px] h-11 px-2 rounded-md border-[1.5px] bg-[var(--bg3)] text-base text-brown text-center outline-none focus:border-terra"
                          style={{ borderColor: isOverMax ? 'var(--red)' : 'var(--border)' }}
                        />
                      </td>
                      <td className="px-2 py-2 text-center text-sm font-semibold text-brown-2 tabular-nums">
                        {r ? r.gain.toFixed(3) : '—'}
                      </td>
                      <td className={`px-2 py-2 text-center text-sm font-semibold ${r ? CATEGORY_TEXT_CLASS[r.category] : 'text-brown-3'}`}>
                        {r ? CATEGORY_LABEL[r.category] : '—'}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button
                          onClick={() => setDeleteRowId(row.id)}
                          aria-label={`Hapus baris ${row.nama || i + 1}`}
                          className="w-11 h-11 rounded-md border-[1.5px] border-red/20 bg-red/10 text-red text-lg font-bold inline-flex items-center justify-center"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-3 flex-wrap mt-5">
            <button
              onClick={hitungSemua}
              className="min-h-11 px-4 rounded-lg bg-terra-d text-white text-sm font-semibold"
            >
              Hitung N-Gain
            </button>
            <button
              onClick={() => setResetModalOpen(true)}
              className="min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
              style={BORDER}
            >
              Reset
            </button>
          </div>
        </div>

        {/* HASIL PANEL */}
        {distribution && (
          <div className="bg-ivory border rounded-xl p-4 md:p-6 mb-5" style={BORDER}>
            <div className="font-['Playfair_Display',serif] text-base font-semibold text-brown mb-4 flex items-center gap-2">
              <span aria-hidden="true">📈</span> Hasil Analisis N-Gain
            </div>

            {/* Average */}
            <div
              className="rounded-xl border p-5 flex items-center gap-5 flex-wrap mb-5"
              style={{ ...BORDER, background: 'linear-gradient(135deg,rgba(212,163,115,.12),rgba(143,162,135,.12))' }}
            >
              <div className="font-['Playfair_Display',serif] text-3xl sm:text-4xl font-bold text-terra-d leading-none">
                {distribution.average.toFixed(3)}
              </div>
              <div className="flex-1 min-w-[160px]">
                <strong className="block text-base font-semibold text-brown mb-0.5">Rata-rata N-Gain Kelas</strong>
                <span className="text-sm text-brown-2">Indeks peningkatan SDL seluruh mahasiswa</span>
              </div>
              <span
                className={`text-xs font-bold tracking-wide uppercase rounded-full px-3.5 py-1.5 ${CATEGORY_BADGE_CLASS[distribution.category]}`}
              >
                Kategori: {CATEGORY_LABEL[distribution.category]}
              </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              <div className="relative overflow-hidden bg-[var(--bg3)] border rounded-lg p-4 text-center" style={BORDER}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-sage" />
                <div className="text-xs font-semibold tracking-wide uppercase text-brown-3 mb-1.5">Tinggi</div>
                <div className="font-['Playfair_Display',serif] text-3xl font-bold text-sage-d">{distribution.tinggi}</div>
                <div className="text-xs text-brown-3 mt-1">N-Gain &gt; 0.7</div>
              </div>
              <div className="relative overflow-hidden bg-[var(--bg3)] border rounded-lg p-4 text-center" style={BORDER}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-terra" />
                <div className="text-xs font-semibold tracking-wide uppercase text-brown-3 mb-1.5">Sedang</div>
                <div className="font-['Playfair_Display',serif] text-3xl font-bold text-terra-d">{distribution.sedang}</div>
                <div className="text-xs text-brown-3 mt-1">0.3 ≤ N-Gain ≤ 0.7</div>
              </div>
              <div className="relative overflow-hidden bg-[var(--bg3)] border rounded-lg p-4 text-center" style={BORDER}>
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-red" />
                <div className="text-xs font-semibold tracking-wide uppercase text-brown-3 mb-1.5">Rendah</div>
                <div className="font-['Playfair_Display',serif] text-3xl font-bold text-red">{distribution.rendah}</div>
                <div className="text-xs text-brown-3 mt-1">N-Gain &lt; 0.3</div>
              </div>
            </div>

            {/* Bar chart */}
            <div className="mb-5">
              <div className="text-sm font-semibold text-brown-2 mb-3">Distribusi Kategori N-Gain</div>
              <div className="flex flex-col gap-2.5">
                {(
                  [
                    ['Tinggi', pctTinggi, CATEGORY_BAR_CLASS.tinggi],
                    ['Sedang', pctSedang, CATEGORY_BAR_CLASS.sedang],
                    ['Rendah', pctRendah, CATEGORY_BAR_CLASS.rendah],
                  ] as const
                ).map(([label, pct, barClass]) => (
                  <div key={label} className="flex items-center gap-3">
                    <div className="text-sm text-brown-2 w-14 text-right flex-shrink-0">{label}</div>
                    <div className="flex-1 h-[22px] bg-[var(--border2)] rounded-full overflow-hidden relative">
                      <div
                        className={`h-full rounded-full transition-[width] ${barClass}`}
                        style={{ width: `${pct}%`, minWidth: pct > 0 ? '2px' : 0 }}
                      />
                    </div>
                    <div className="text-xs text-brown-3 w-10 flex-shrink-0 tabular-nums">{pct.toFixed(1)}%</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Export */}
            <div className="flex items-center gap-3 flex-wrap">
              <button
                onClick={exportCSV}
                className="min-h-11 px-4 rounded-lg border-[1.5px] bg-[var(--bg3)] text-brown-2 text-sm font-semibold"
                style={BORDER}
              >
                ⬇️ Export CSV
              </button>
              <span className="text-xs text-brown-3">Unduh hasil sebagai file .csv untuk laporan penelitian</span>
            </div>
          </div>
        )}

        {/* INTERPRETASI PANEL */}
        <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
          <div className="font-['Playfair_Display',serif] text-base font-semibold text-brown mb-4 flex items-center gap-2">
            <span aria-hidden="true">💡</span> Interpretasi N-Gain
          </div>
          <div className="bg-sage/[.08] border-l-[3px] border-sage rounded-r-lg p-4">
            <h4 className="text-sm font-semibold text-brown mb-2">Tentang N-Gain (Normalized Gain)</h4>
            <p className="text-sm text-brown-2 leading-relaxed mb-2">
              N-Gain (g) adalah indeks yang mengukur seberapa besar peningkatan belajar dari pre-test ke post-test,
              dinormalisasi terhadap kemungkinan peningkatan maksimal. Rumus: <strong>g = (Post − Pre) / (Max − Pre)</strong>.
            </p>
            <p className="text-sm text-brown-2 leading-relaxed">
              Kategori interpretasi menurut Hake (1998): <strong className="text-sage-d">Tinggi (g &gt; 0.7)</strong> —
              pembelajaran sangat efektif; <strong className="text-terra-d">Sedang (0.3 ≤ g ≤ 0.7)</strong> — cukup
              efektif; <strong className="text-red">Rendah (g &lt; 0.3)</strong> — perlu perbaikan strategi
              pembelajaran.
            </p>
          </div>

          {distribution && (
            <div className="text-sm text-brown leading-relaxed mt-3 p-3.5 rounded-lg border bg-[var(--bg3)]" style={BORDER}>
              <p className="mb-2.5">
                Pembelajaran SDL dengan menggunakan SMART-FLIP 5.0 menunjukkan efektivitas yang{' '}
                <strong>
                  {distribution.category === 'tinggi'
                    ? 'sangat baik'
                    : distribution.category === 'sedang'
                      ? 'cukup baik'
                      : 'perlu ditingkatkan'}
                </strong>{' '}
                dalam meningkatkan kemampuan mahasiswa. Rata-rata N-Gain kelas sebesar{' '}
                <strong>{distribution.average.toFixed(3)}</strong> berada pada kategori{' '}
                <em>{CATEGORY_LABEL[distribution.category]}</em>.{' '}
                {distribution.category === 'tinggi' &&
                  'Mengindikasikan bahwa media pembelajaran digital berbasis flipbook secara signifikan mampu meningkatkan kompetensi mahasiswa pada mata kuliah Metode Penelitian dan Pengembangan.'}
                {distribution.category === 'sedang' &&
                  'Diperlukan optimalisasi lebih lanjut pada komponen modul yang memiliki N-Gain rendah agar efektivitas pembelajaran dapat ditingkatkan.'}
                {distribution.category === 'rendah' &&
                  'Disarankan untuk melakukan revisi mendalam terhadap konten modul, strategi scaffolding, dan mekanisme umpan balik kuis formatif.'}
              </p>
              <p>
                Distribusi kategori: <strong className="text-sage-d">{distribution.tinggi} mahasiswa ({pctTinggi.toFixed(1)}%)</strong> kategori
                Tinggi, <strong className="text-terra-d">{distribution.sedang} mahasiswa ({pctSedang.toFixed(1)}%)</strong> kategori
                Sedang, dan <strong className="text-red">{distribution.rendah} mahasiswa ({pctRendah.toFixed(1)}%)</strong> kategori
                Rendah dari total {distribution.total} responden.
              </p>
              <p className="mt-2 text-xs text-brown-3">
                Referensi: Hake, R.R. (1998). Interactive-engagement versus traditional methods: A six-thousand-student
                survey of mechanics test data for introductory physics courses. <em>American Journal of Physics, 66</em>
                (1), 64–74.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RESET CONFIRMATION MODAL — destructive action per CLAUDE.md Modal Wajib rule */}
      {resetModalOpen && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setResetModalOpen(false) }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Reset tabel data?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Semua data pre-test/post-test yang sudah diinput akan diganti dengan data contoh. Tindakan ini tidak
              dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setResetModalOpen(false)}
                className="flex-1 h-11 rounded-lg border border-[color:var(--border)] text-sm text-brown-2"
              >
                Batal
              </button>
              <button
                onClick={performReset}
                className="flex-1 h-11 rounded-lg bg-red text-white text-sm font-semibold"
              >
                Ya, Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ROW CONFIRMATION MODAL — destructive action per CLAUDE.md Modal Wajib rule */}
      {deleteRowId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteRowId(null) }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus baris ini?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Data pre-test/post-test mahasiswa ini akan dihapus dari tabel. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteRowId(null)}
                className="flex-1 h-11 rounded-lg border border-[color:var(--border)] text-sm text-brown-2"
              >
                Batal
              </button>
              <button
                onClick={() => { deleteRow(deleteRowId); setDeleteRowId(null) }}
                className="flex-1 h-11 rounded-lg bg-red text-white text-sm font-semibold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] whitespace-nowrap max-w-[90vw] text-center"
          style={{ background: 'var(--brown)', color: '#fff', boxShadow: '0 4px 16px rgba(62,54,46,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}
