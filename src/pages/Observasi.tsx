import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { IconCompass, IconLink, IconUpload } from '../components/icons'
import {
  fetchObservasiSubmissions,
  fetchObservasiTugas,
  formatTanggalObservasi,
  isTerlambat,
  OBSERVASI_STATUS_BADGE,
  OBSERVASI_STATUS_LABEL,
  submitObservasi,
  uploadObservasiFile,
  type ObservasiTugas,
} from '../lib/observasi'

const BORDER = { borderColor: 'var(--border)' } as const

// Sisi MAHASISWA dari fitur Aktivitas Mandiri (Observasi Lapangan). Sengaja
// halaman tersendiri, bukan tab di /asesmen: rute /asesmen dijaga
// ProtectedRoute roles={['dosen']}, dan halaman itu memang berisi rekap kelas
// yang tidak boleh dilihat mahasiswa. Yang dibagi bersama adalah data
// layer-nya (src/lib/observasi.ts), bukan halamannya.
//
// Dua jalur pengumpulan yang diminta konsep Asesmen ada di satu form yang
// sama — mahasiswa boleh mengisi salah satu atau dua-duanya sekaligus,
// karena laporan observasi sering berupa berkas foto/PDF PLUS ringkasan
// singkat yang enak dibaca dosen tanpa harus mengunduh apa pun.
export default function Observasi() {
  const queryClient = useQueryClient()

  const { data: tugasData, isLoading } = useQuery({
    queryKey: ['observasi-tugas'],
    queryFn: fetchObservasiTugas,
  })
  const { data: subsData } = useQuery({
    queryKey: ['observasi-submissions'],
    queryFn: fetchObservasiSubmissions,
  })

  const offline = tugasData === null
  const tugasList = useMemo(() => tugasData ?? [], [tugasData])
  const submissions = useMemo(() => subsData ?? [], [subsData])

  const [teksDraft, setTeksDraft] = useState<Record<number, string>>({})
  const [fileDraft, setFileDraft] = useState<Record<number, File | null>>({})
  const [errorPerTugas, setErrorPerTugas] = useState<Record<number, string | null>>({})
  const [konfirmasi, setKonfirmasi] = useState<ObservasiTugas | null>(null)
  const [mengirim, setMengirim] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // Satu ref per tugas supaya tombol "Pilih Berkas" bisa memicu <input
  // type="file"> yang disembunyikan (input bawaan browser tidak bisa
  // ditema, dan tinggi bawaannya di bawah target sentuh 44px).
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({})

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function jawabanUntuk(tugasId: number) {
    return submissions.find((s) => s.tugasId === tugasId) ?? null
  }

  /** Isi awal textarea: kalau sudah pernah mengumpulkan, tampilkan tulisannya. */
  function nilaiTeks(tugasId: number): string {
    const draft = teksDraft[tugasId]
    if (draft !== undefined) return draft
    return jawabanUntuk(tugasId)?.isiTeks ?? ''
  }

  async function kirim() {
    if (!konfirmasi) return
    const tugasId = konfirmasi.id
    const teks = nilaiTeks(tugasId).trim()
    const berkas = fileDraft[tugasId] ?? null
    const lama = jawabanUntuk(tugasId)

    if (!teks && !berkas && !lama?.fileUrl) {
      setErrorPerTugas((e) => ({ ...e, [tugasId]: 'Tulis hasil observasimu atau unggah berkasnya dulu.' }))
      setKonfirmasi(null)
      return
    }

    setMengirim(true)
    setErrorPerTugas((e) => ({ ...e, [tugasId]: null }))
    try {
      // Berkas lama dipertahankan kalau mahasiswa hanya memperbaiki tulisannya
      // — tanpa ini, menyunting teks akan diam-diam melepas lampiran yang
      // sudah diunggah sebelumnya.
      let fileUrl = lama?.fileUrl ?? null
      let fileName = lama?.fileName ?? null
      if (berkas) {
        const hasil = await uploadObservasiFile(tugasId, berkas)
        fileUrl = hasil.url
        fileName = hasil.name
      }
      await submitObservasi({ tugasId, isiTeks: teks, fileUrl, fileName })
      setKonfirmasi(null)
      setFileDraft((f) => ({ ...f, [tugasId]: null }))
      if (fileInputs.current[tugasId]) fileInputs.current[tugasId]!.value = ''
      await queryClient.invalidateQueries({ queryKey: ['observasi-submissions'] })
      showToast('Hasil observasi terkirim!')
    } catch (e) {
      setErrorPerTugas((err) => ({
        ...err,
        [tugasId]: e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.',
      }))
      setKonfirmasi(null)
    } finally {
      setMengirim(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5 pb-4 border-b" style={BORDER}>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-brown mb-1">Aktivitas Mandiri</h1>
          <p className="text-sm text-brown-3 leading-relaxed">
            Tugas observasi lapangan dari dosenmu. Kumpulkan hasilnya dengan mengunggah berkas, menulis
            langsung di sini, atau keduanya.
          </p>
        </div>

        {isLoading ? (
          <div className="text-center py-14 text-brown-3 text-sm">Memuat tugas observasi…</div>
        ) : tugasList.length === 0 ? (
          <div className="text-center py-14 px-4 text-brown-3 text-sm">
            <span className="flex justify-center mb-2">
              <IconCompass size={28} />
            </span>
            {offline
              ? 'Tugas observasi butuh koneksi Supabase — belum tersedia di mode demo.'
              : 'Belum ada tugas observasi dari dosenmu.'}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {tugasList.map((t) => {
              const jawaban = jawabanUntuk(t.id)
              const badge = jawaban ? OBSERVASI_STATUS_BADGE[jawaban.status] : null
              const telat = jawaban ? isTerlambat(t.deadline, jawaban.submittedAt) : false
              const berkasBaru = fileDraft[t.id] ?? null
              const pesan = errorPerTugas[t.id]

              return (
                <div key={t.id} className="bg-ivory border rounded-xl p-4 md:p-5" style={BORDER}>
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <div className="text-sm font-semibold text-brown leading-snug">{t.judul}</div>
                      <div className="text-xs text-brown-3 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                        <span>{t.modulJudul ?? 'Tanpa modul'}</span>
                        <span aria-hidden>&middot;</span>
                        <span>Batas: {t.deadline ? formatTanggalObservasi(t.deadline) : 'bebas'}</span>
                      </div>
                    </div>
                    {badge && jawaban && (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: badge.bg, color: badge.color }}
                      >
                        {OBSERVASI_STATUS_LABEL[jawaban.status]}
                      </span>
                    )}
                  </div>

                  {t.deskripsi && (
                    <p className="text-sm text-brown-2 leading-relaxed mt-2.5 whitespace-pre-wrap break-words">
                      {t.deskripsi}
                    </p>
                  )}

                  {jawaban?.catatanDosen && (
                    <div
                      className="mt-3 px-3 py-2.5 rounded-lg border-l-[3px] text-sm text-brown-2 leading-relaxed whitespace-pre-wrap break-words"
                      style={{ background: '#FEF9F4', borderLeftColor: 'var(--terra)' }}
                    >
                      <strong className="block text-xs font-semibold text-brown mb-0.5">Catatan Dosen</strong>
                      {jawaban.catatanDosen}
                    </div>
                  )}

                  <div className="mt-4">
                    <label className="block text-xs font-semibold text-brown-2 mb-3">
                      Tulis Hasil Observasi
                      <textarea
                        value={nilaiTeks(t.id)}
                        onChange={(e) => setTeksDraft((d) => ({ ...d, [t.id]: e.target.value }))}
                        rows={5}
                        placeholder="Apa yang kamu amati di lapangan, kapan, di mana, dan apa kesimpulanmu…"
                        className="block w-full mt-1 rounded-lg border px-3 py-2.5 text-base md:text-sm text-brown resize-y min-h-[110px]"
                        style={{ ...BORDER, background: 'var(--bg3)' }}
                      />
                    </label>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <input
                        ref={(el) => {
                          fileInputs.current[t.id] = el
                        }}
                        type="file"
                        className="hidden"
                        onChange={(e) => setFileDraft((f) => ({ ...f, [t.id]: e.target.files?.[0] ?? null }))}
                      />
                      <button
                        onClick={() => fileInputs.current[t.id]?.click()}
                        className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border-[1.5px] text-sm font-semibold text-brown-2"
                        style={{ ...BORDER, background: 'var(--bg3)' }}
                      >
                        <IconUpload size={15} /> {berkasBaru ? 'Ganti Berkas' : 'Unggah Berkas'}
                      </button>
                      <span className="text-xs text-brown-3 break-all min-w-0">
                        {berkasBaru ? berkasBaru.name : 'Opsional — foto, PDF, atau dokumen laporan.'}
                      </span>
                    </div>

                    {jawaban?.fileUrl && !berkasBaru && (
                      <a
                        href={jawaban.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-terra-d break-all"
                      >
                        <IconLink size={13} /> Berkas terkirim: {jawaban.fileName || 'lihat berkas'}
                      </a>
                    )}

                    {pesan && <p className="text-xs text-red mt-2.5 leading-relaxed">{pesan}</p>}

                    <div className="flex items-center gap-3 flex-wrap mt-3">
                      <button
                        onClick={() => setKonfirmasi(t)}
                        disabled={offline}
                        className="min-h-11 px-5 rounded-lg text-sm font-semibold disabled:opacity-50"
                        style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
                      >
                        {jawaban ? 'Perbarui Pengumpulan' : 'Kumpulkan'}
                      </button>
                      {jawaban && (
                        <span className="text-xs text-brown-3">
                          Terkirim {formatTanggalObservasi(jawaban.submittedAt)}
                          {telat && <span className="text-red font-semibold"> · terlambat</span>}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Konfirmasi kirim — "submit final" wajib pakai modal (CLAUDE.md), dan
          di sini konsekuensinya nyata: mengirim ulang MENIMPA jawaban lama. */}
      {konfirmasi && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !mengirim) setKonfirmasi(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown mb-1.5">Kumpulkan hasil observasi?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {jawabanUntuk(konfirmasi.id)
                ? 'Pengumpulan sebelumnya akan ditimpa dan statusnya kembali jadi "Menunggu Review".'
                : `Hasilmu untuk "${konfirmasi.judul}" akan dikirim ke dosen. Kamu masih bisa memperbaruinya nanti.`}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setKonfirmasi(null)}
                disabled={mengirim}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void kirim()}
                disabled={mengirim}
                className="flex-1 min-h-11 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
              >
                {mengirim ? 'Mengirim…' : 'Ya, Kumpulkan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 left-6 sm:left-auto px-5 py-2.5 rounded-xl text-sm font-semibold z-[999] text-center sm:text-left"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}
