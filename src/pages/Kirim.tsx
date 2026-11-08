import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Layout } from '../components/Layout'
import { useAuth } from '../contexts/AuthContext'
import {
  fetchLaporan,
  kirimLaporan,
  ubahStatusLaporan,
  validasiLaporan,
  LaporanBelumAktif,
  ISI_MAKS,
  HALAMAN_MAKS,
  LABEL_JENIS,
  LABEL_STATUS,
  type JenisLaporan,
  type Laporan,
  type StatusLaporan,
} from '../lib/laporan'

// Menu Kirim saran dan laporan bug (angket butir 11, antrean #373). Semua pengguna masuk boleh mengirim;
// dosen juga melihat semua laporan dan menandainya dibaca atau selesai. Tabel dan hak aksesnya: SQL v58.
const BORDER = { borderColor: 'var(--border)' } as const
const WARNA_STATUS: Record<StatusLaporan, { background: string; color: string }> = {
  baru: { background: 'var(--danger-soft)', color: 'var(--danger)' },
  dibaca: { background: 'var(--info-soft)', color: 'var(--info)' },
  selesai: { background: 'var(--success-soft)', color: 'var(--success)' },
}

function tglJam(iso: string): string {
  return new Date(iso).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function Kirim() {
  const { user, role } = useAuth()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const [jenis, setJenis] = useState<JenisLaporan>('saran')
  const [isi, setIsi] = useState('')
  const [halaman, setHalaman] = useState((params.get('dari') ?? '').slice(0, HALAMAN_MAKS))
  const [mengirim, setMengirim] = useState(false)
  const [pesan, setPesan] = useState<{ jenis: 'ok' | 'salah'; teks: string } | null>(null)
  const dosen = role === 'dosen'

  const { data: daftar = [], error: galatBaca } = useQuery({
    queryKey: ['laporan', dosen ? 'semua' : user?.id],
    queryFn: () => fetchLaporan({ semua: dosen, userId: user?.id }),
    retry: false,
  })
  const belumAktif = galatBaca instanceof LaporanBelumAktif

  async function kirim() {
    const salah = validasiLaporan(isi, halaman)
    if (salah) return setPesan({ jenis: 'salah', teks: salah })
    setMengirim(true)
    setPesan(null)
    try {
      await kirimLaporan({ jenis, isi, halaman })
      setIsi('')
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
      <div className="p-4 md:p-6 max-w-3xl">
        <h1 className="font-display text-xl font-bold text-brown mb-1">Kirim Saran dan Laporan Bug</h1>
        <p className="text-sm text-brown-3 mb-5">Ceritakan apa yang menurutmu perlu diperbaiki, atau apa yang tidak berjalan semestinya. Pesanmu dibaca dosen pengelola.</p>

        <div className="bg-ivory border rounded-2xl p-5 mb-6" style={BORDER}>
          <div role="group" aria-label="Jenis kiriman" className="flex gap-2 mb-4">
            {(['saran', 'bug'] as const).map((j) => (
              <button
                key={j}
                type="button"
                aria-pressed={jenis === j}
                onClick={() => setJenis(j)}
                className={`btn flex-1 ${jenis === j ? 'btn-primary' : 'btn-secondary'}`}
              >
                {LABEL_JENIS[j]}
              </button>
            ))}
          </div>

          <label htmlFor="kirim-isi" className="block text-xs font-semibold text-brown-2 mb-1.5">
            {jenis === 'bug' ? 'Apa yang terjadi, dan langkah sebelum itu?' : 'Apa sarannya?'}
          </label>
          <textarea
            id="kirim-isi"
            value={isi}
            onChange={(e) => setIsi(e.target.value.slice(0, ISI_MAKS))}
            rows={6}
            placeholder={jenis === 'bug' ? 'Contoh: saat saya menekan Kirim di tes formatif, halaman menjadi putih.' : 'Contoh: tampilan nilai akan lebih jelas bila ada grafik.'}
            className="w-full rounded-[var(--radius-control)] border p-3 text-base outline-none transition-[border-color,box-shadow] hover:border-terra focus:border-terra focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            style={{ ...BORDER, background: 'var(--bg3)', color: 'var(--brown)' }}
          />
          <p className="text-xs text-brown-3 mt-1 mb-4 tabular-nums">{isi.length}/{ISI_MAKS} karakter</p>

          <label htmlFor="kirim-halaman" className="block text-xs font-semibold text-brown-2 mb-1.5">Halaman terkait (boleh dikosongkan)</label>
          <input
            id="kirim-halaman"
            value={halaman}
            onChange={(e) => setHalaman(e.target.value.slice(0, HALAMAN_MAKS))}
            placeholder="Contoh: /asesmen/formatif/1"
            className="w-full h-[46px] rounded-[var(--radius-control)] border px-3.5 text-base outline-none transition-[border-color,box-shadow] hover:border-terra focus:border-terra focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            style={{ ...BORDER, background: 'var(--bg3)', color: 'var(--brown)' }}
          />

          {pesan && (
            <p role="status" className={`text-sm mt-4 ${pesan.jenis === 'ok' ? 'text-success' : 'text-danger'}`}>
              {pesan.teks}
            </p>
          )}
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => void kirim()} disabled={mengirim || belumAktif} className="btn btn-primary min-w-[140px]">
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
          <ul className="list-none m-0 p-0 flex flex-col gap-2.5">
            {daftar.map((l) => (
              <li key={l.id} className="bg-ivory border rounded-xl p-4" style={BORDER}>
                <div className="flex items-center gap-2 flex-wrap mb-1.5 text-xs text-brown-3">
                  <span className="font-semibold text-brown-2">{LABEL_JENIS[l.jenis]}</span>
                  <span className="px-2 py-0.5 rounded-md font-bold" style={WARNA_STATUS[l.status]}>{LABEL_STATUS[l.status]}</span>
                  {dosen && l.nama && <span>· {l.nama}</span>}
                  <span className="ml-auto tabular-nums">{tglJam(l.createdAt)}</span>
                </div>
                <p className="text-sm text-brown whitespace-pre-line m-0">{l.isi}</p>
                {l.halaman && <p className="text-xs text-brown-3 mt-2 mb-0">Halaman: {l.halaman}</p>}
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
