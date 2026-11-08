import { useRef, useState, type ClipboardEvent, type DragEvent } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchLaporan,
  fetchLampiran,
  kirimLaporan,
  ubahStatusLaporan,
  validasiLaporan,
  validasiLampiran,
  bacaSebagaiDataUrl,
  LaporanBelumAktif,
  ISI_MAKS,
  HALAMAN_MAKS,
  LABEL_JENIS,
  LABEL_STATUS,
  type JenisLaporan,
  type Laporan,
  type StatusLaporan,
} from '../lib/laporan'

// Menu Kirim saran dan laporan bug (angket butir 11, antrean #373; tata letak lebar dan lampiran gambar paling besar
// 1 MB: antrean #377). Semua pengguna masuk boleh mengirim; dosen juga melihat semua laporan dan menandainya dibaca
// atau selesai. Tabel dan hak aksesnya: SQL v58 dan v59. Tangkapan layar bisa ditempel langsung (Ctrl+V) di kolom isi.
const BORDER = { borderColor: 'var(--border)' } as const
const WARNA_STATUS: Record<StatusLaporan, { background: string; color: string }> = {
  baru: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  dibaca: { background: 'var(--info-soft)', color: 'var(--info)' },
  selesai: { background: 'var(--success-soft)', color: 'var(--success)' },
}
const KELAS_ISIAN =
  'w-full rounded-[var(--radius-control)] border text-base outline-none transition-[border-color,box-shadow] hover:border-terra focus:border-terra focus:shadow-[0_0_0_3px_var(--accent-soft)]'
const GAYA_ISIAN = { ...BORDER, background: 'var(--bg3)', color: 'var(--brown)' }

function tglJam(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Gambar lampiran satu laporan: diambil hanya saat dibuka, supaya daftar tetap ringan. */
function LampiranLaporan({ id }: { id: string }) {
  const [buka, setBuka] = useState(false)
  const { data, isLoading, error } = useQuery({ queryKey: ['laporan-lampiran', id], queryFn: () => fetchLampiran(id), enabled: buka, retry: false })
  return (
    <div className="mt-3">
      <button type="button" onClick={() => setBuka((b) => !b)} aria-expanded={buka} className="btn btn-secondary btn-sm">
        {buka ? 'Sembunyikan lampiran' : 'Lihat lampiran'}
      </button>
      {buka && (
        <div className="mt-3">
          {isLoading && <p className="text-sm text-brown-3">Memuat gambar…</p>}
          {error && <p className="text-sm text-danger">Gambar tidak bisa dimuat.</p>}
          {data && <img src={data} alt="Lampiran laporan" className="max-h-96 max-w-full rounded-lg border object-contain bg-white" style={BORDER} />}
          {!isLoading && !error && !data && <p className="text-sm text-brown-3">Lampiran tidak ditemukan.</p>}
        </div>
      )}
    </div>
  )
}

export default function Kirim() {
  const { user, role } = useAuth()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [jenis, setJenis] = useState<JenisLaporan>('saran')
  const [isi, setIsi] = useState('')
  const [halaman, setHalaman] = useState((params.get('dari') ?? '').slice(0, HALAMAN_MAKS))
  const [lampiran, setLampiran] = useState<{ dataUrl: string; nama: string; ukuran: number } | null>(null)
  const [seretDi, setSeretDi] = useState(false)
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'salah'; teks: string } | null>(null)
  const inputBerkas = useRef<HTMLInputElement>(null)
  const dosen = role === 'dosen'

  const { data: daftar = [], error: galatBaca } = useQuery({
    queryKey: ['laporan', dosen ? 'semua' : user?.id],
    queryFn: () => fetchLaporan({ semua: dosen, userId: user?.id }),
    retry: false,
  })
  const belumAktif = galatBaca instanceof LaporanBelumAktif

  async function pilihBerkas(berkas: File | null | undefined) {
    if (!berkas) return
    const salah = validasiLampiran(berkas)
    if (salah) return setPesan({ jenis: 'salah', teks: salah })
    try {
      setLampiran({ dataUrl: await bacaSebagaiDataUrl(berkas), nama: berkas.name || 'tangkapan-layar', ukuran: berkas.size })
      setPesan(null)
    } catch {
      setPesan({ jenis: 'salah', teks: 'Gambar tidak bisa dibaca. Coba berkas lain.' })
    }
  }
  function tempel(e: ClipboardEvent<HTMLTextAreaElement>) {
    const gambar = [...e.clipboardData.files].find((f) => f.type.startsWith('image/'))
    if (gambar) {
      e.preventDefault()
      void pilihBerkas(gambar)
    }
  }
  function lepas(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setSeretDi(false)
    void pilihBerkas(e.dataTransfer.files[0])
  }

  async function kirim() {
    const salah = validasiLaporan(isi, halaman)
    if (salah) return setPesan({ jenis: 'salah', teks: salah })
    setMengirim(true)
    setPesan(null)
    try {
      await kirimLaporan({ jenis, isi, halaman, lampiran: lampiran?.dataUrl })
      setIsi('')
      setLampiran(null)
      setPesan({ jenis: 'ok', teks: 'Terima kasih, laporanmu sudah terkirim.' })
      await queryClient.invalidateQueries({ queryKey: ['laporan'] })
    } catch (e) {
      setPesan({ jenis: 'salah', teks: e instanceof Error ? e.message : 'Gagal mengirim. Coba lagi.' })
    } finally {
      setMengirim(false)
    }
  }

  async function tandai(l: Laporan, status: StatusLaporan) {
    try {
      await ubahStatusLaporan(l.id, status)
      await queryClient.invalidateQueries({ queryKey: ['laporan'] })
    } catch {
      setPesan({ jenis: 'salah', teks: 'Gagal mengubah status.' })
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6">
        <h1 className="font-display text-xl font-bold text-brown mb-1">Kirim Saran dan Laporan Bug</h1>
        <p className="text-sm text-brown-3 mb-5">Ceritakan apa yang menurutmu perlu diperbaiki, atau apa yang tidak berjalan semestinya. Pesanmu dibaca dosen pengelola.</p>

        {/* Satu kolom ke bawah selebar halaman (antrean #380): jenis, isi, halaman terkait, lampiran, Kirim. */}
        <div className="bg-ivory border rounded-2xl p-5 md:p-6 mb-8 flex flex-col gap-5" style={BORDER}>
          <div role="group" aria-label="Jenis kiriman" className="flex gap-2 max-w-md">
            {(['saran', 'bug'] as const).map((j) => (
              <button key={j} type="button" aria-pressed={jenis === j} onClick={() => setJenis(j)} className={`btn flex-1 ${jenis === j ? 'btn-primary' : 'btn-secondary'}`}>
                {LABEL_JENIS[j]}
              </button>
            ))}
          </div>

          <div>
            <label htmlFor="kirim-isi" className="block text-xs font-semibold text-brown-2 mb-1.5">
              {jenis === 'bug' ? 'Apa yang terjadi, dan langkah sebelum itu?' : 'Apa sarannya?'}
            </label>
            <textarea
              id="kirim-isi"
              value={isi}
              onChange={(e) => setIsi(e.target.value.slice(0, ISI_MAKS))}
              onPaste={tempel}
              rows={8}
              placeholder={jenis === 'bug' ? 'Contoh: saat saya menekan Kirim di tes formatif, halaman menjadi putih.' : 'Contoh: tampilan nilai akan lebih jelas bila ada grafik.'}
              className={`${KELAS_ISIAN} p-3 block min-h-[220px] resize-y`}
              style={GAYA_ISIAN}
            />
            <p className="text-xs text-brown-3 mt-1 tabular-nums">{isi.length}/{ISI_MAKS} karakter · tangkapan layar bisa ditempel di sini (Ctrl+V)</p>
          </div>

          <div>
            <label htmlFor="kirim-halaman" className="block text-xs font-semibold text-brown-2 mb-1.5">Halaman terkait (boleh dikosongkan)</label>
            <input
              id="kirim-halaman"
              value={halaman}
              onChange={(e) => setHalaman(e.target.value.slice(0, HALAMAN_MAKS))}
              placeholder="Contoh: /asesmen/formatif/1"
              className={`${KELAS_ISIAN} h-[46px] px-3.5`}
              style={GAYA_ISIAN}
            />
          </div>

          <div>
            <p className="text-xs font-semibold text-brown-2 mb-1.5">Lampiran gambar (boleh dikosongkan)</p>
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setSeretDi(true)
              }}
              onDragLeave={() => setSeretDi(false)}
              onDrop={lepas}
              className="rounded-[var(--radius-control)] border-2 border-dashed p-4 transition-colors"
              style={{ borderColor: seretDi ? 'var(--terra)' : 'var(--border)', background: seretDi ? 'var(--accent-soft)' : 'transparent' }}
            >
              {lampiran ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img src={lampiran.dataUrl} alt="Pratinjau lampiran" className="max-h-40 max-w-full self-start rounded-lg border object-contain bg-white" style={BORDER} />
                  <div className="min-w-0">
                    <p className="text-xs text-brown-3 mb-2 break-all">{lampiran.nama} · {(lampiran.ukuran / 1024).toFixed(0)} KB</p>
                    <button type="button" onClick={() => setLampiran(null)} className="btn btn-secondary btn-sm">Hapus lampiran</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <button type="button" onClick={() => inputBerkas.current?.click()} className="btn btn-secondary btn-sm self-start">Pilih gambar</button>
                  <p className="text-sm text-brown-2 m-0">atau seret gambar ke sini · <span className="text-xs text-brown-3">PNG, JPG, atau WebP, paling besar 1 MB</span></p>
                </div>
              )}
              <input
                ref={inputBerkas}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                aria-label="Pilih gambar lampiran"
                onChange={(e) => {
                  void pilihBerkas(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
            </div>
          </div>

          <div>
            {pesan && (
              <p role="status" className={`text-sm mb-3 ${pesan.jenis === 'ok' ? 'text-success' : 'text-danger'}`}>
                {pesan.teks}
              </p>
            )}
            <button type="button" onClick={() => void kirim()} disabled={mengirim || belumAktif} className="btn btn-primary w-full sm:w-auto sm:min-w-[160px]">
              {mengirim ? 'Mengirim…' : 'Kirim'}
            </button>
          </div>
        </div>

        <h2 className="text-sm font-semibold text-brown mb-3">{dosen ? 'Semua kiriman' : 'Kirimanku'}</h2>
        {belumAktif ? (
          <p className="text-sm text-brown-3">Menu Kirim belum aktif di server. Hubungi pengelola.</p>
        ) : daftar.length === 0 ? (
          <p className="text-sm text-brown-3">Belum ada kiriman.</p>
        ) : (
          <ul className="list-none m-0 p-0 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
            {daftar.map((l) => (
              <li key={l.id} className="bg-ivory border rounded-xl p-4 min-w-0" style={BORDER}>
                <div className="flex items-center gap-2 flex-wrap mb-1.5 text-xs text-brown-3">
                  <span className="font-semibold text-brown-2">{LABEL_JENIS[l.jenis]}</span>
                  <span className="px-2 py-0.5 rounded-md font-bold" style={WARNA_STATUS[l.status]}>{LABEL_STATUS[l.status]}</span>
                  {dosen && l.nama && <span>· {l.nama}</span>}
                  <span className="ml-auto tabular-nums">{tglJam(l.createdAt)}</span>
                </div>
                <p className="text-sm text-brown whitespace-pre-line break-words m-0">{l.isi}</p>
                {l.halaman && <p className="text-xs text-brown-3 mt-2 mb-0 break-all">Halaman: {l.halaman}</p>}
                {l.adaLampiran && <LampiranLaporan id={l.id} />}
                {dosen && (
                  <div className="flex gap-2 mt-3">
                    {l.status !== 'dibaca' && l.status !== 'selesai' && (
                      <button type="button" onClick={() => void tandai(l, 'dibaca')} className="btn btn-secondary btn-sm">Tandai dibaca</button>
                    )}
                    {l.status !== 'selesai' && (
                      <button type="button" onClick={() => void tandai(l, 'selesai')} className="btn btn-secondary btn-sm">Tandai selesai</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Layout>
  )
}
