import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { timeAgo } from '../lib/forum'
import {
  PESAN_BAWAAN,
  fetchPengingatSaya,
  isiPengingat,
  judulPengingat,
  kirimPengingat,
  tandaiPengingatDibaca,
} from '../lib/pengingat'

// Pengingat dosen ke mahasiswa (antrean #338): modal kirim di tab Perlu
// Perhatian Dashboard dosen, dan kartu di Dashboard mahasiswa (tanpa lonceng,
// sama dengan Kabar Terbaru #189).
const BORDER = { borderColor: 'var(--border)' } as const

export interface SasaranPengingat {
  userId: string
  nama: string
  keterangan: string
}

export function IngatkanModal({
  sasaran,
  mataKuliah,
  onClose,
}: {
  sasaran: SasaranPengingat[]
  mataKuliah?: string
  onClose: () => void
}) {
  const queryClient = useQueryClient()
  const [pesan, setPesan] = useState(PESAN_BAWAAN)
  const [mengirim, setMengirim] = useState(false)
  const [hasil, setHasil] = useState<{ terkirim: number; gagal: string[] } | null>(null)
  const contoh = sasaran[0]

  async function kirim() {
    setMengirim(true)
    try {
      const r = await kirimPengingat(
        sasaran.map((s) => ({ userId: s.userId, body: isiPengingat(s.nama, pesan, s.keterangan) })),
        judulPengingat(mataKuliah),
      )
      const namaGagal = sasaran.filter((s) => r.gagal.includes(s.userId)).map((s) => s.nama)
      setHasil({ terkirim: r.terkirim.length, gagal: namaGagal })
      queryClient.invalidateQueries({ queryKey: ['pengingat-terakhir'] })
    } catch {
      setHasil({ terkirim: 0, gagal: sasaran.map((s) => s.nama) })
    } finally {
      setMengirim(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', backdropFilter: 'blur(4px)', animation: 'fadeInBg 0.18s ease' }}
      onClick={(e) => { if (e.target === e.currentTarget && !mengirim) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-ingatkan"
        className="rounded-2xl modal-sedang w-full p-5 sm:p-6 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
        style={{
          background: 'var(--ivory)',
          boxShadow: '0 8px 40px color-mix(in srgb, var(--shadow-color) 22%, transparent)',
          animation: 'slideUpModal 0.22s ease',
        }}
      >
        <h3 id="judul-ingatkan" className="font-display text-lg font-bold text-brown">
          {sasaran.length === 1 ? `Ingatkan ${contoh.nama}` : `Ingatkan ${sasaran.length} mahasiswa`}
        </h3>

        {hasil ? (
          <>
            <p className="text-sm text-brown">
              {hasil.terkirim > 0 ? `Terkirim ke ${hasil.terkirim} mahasiswa.` : 'Tidak ada pengingat yang terkirim.'}
            </p>
            {hasil.gagal.length > 0 && (
              <p className="text-sm" style={{ color: 'var(--danger)' }}>
                Gagal untuk {hasil.gagal.join(', ')}. Mahasiswa itu sudah diingatkan dalam 24 jam terakhir, atau basis data
                belum diperbarui (SQL v55).
              </p>
            )}
            <button type="button" onClick={onClose} className="btn btn-primary self-end">
              Tutup
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-brown-2">
              Pengingat muncul di Dashboard mahasiswa. Tiap mahasiswa paling banyak diingatkan sekali dalam 24 jam.
            </p>
            {sasaran.length > 1 && (
              <p className="text-[13px] text-brown-3">Penerima: {sasaran.map((s) => s.nama).join(', ')}</p>
            )}
            <label className="flex flex-col gap-1.5 text-sm font-medium text-brown">
              Pesan
              <textarea
                value={pesan}
                onChange={(e) => setPesan(e.target.value)}
                rows={3}
                maxLength={300}
                disabled={mengirim}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y w-full font-normal"
                style={BORDER}
              />
            </label>
            <div className="rounded-xl border px-3.5 py-3 text-[13px] text-brown-2 whitespace-pre-line" style={{ ...BORDER, background: 'var(--bg3)' }}>
              <span className="block text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Contoh yang diterima {contoh.nama}</span>
              {isiPengingat(contoh.nama, pesan, contoh.keterangan)}
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={onClose} disabled={mengirim} className="btn btn-secondary flex-1">
                Batal
              </button>
              <button type="button" onClick={kirim} disabled={mengirim || !pesan.trim()} className="btn btn-primary flex-1">
                {mengirim ? 'Mengirim…' : 'Kirim Pengingat'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

/** Kartu Dashboard mahasiswa: pengingat dosen yang belum dibaca. Tidak tampil bila kosong. */
export function PengingatMhsCard() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const kunci = ['pengingat-saya', user?.id]
  const { data: daftar = [] } = useQuery({ queryKey: kunci, queryFn: () => fetchPengingatSaya(user?.id) })
  const [galat, setGalat] = useState(false)
  if (daftar.length === 0) return null

  async function dibaca(id: string) {
    try {
      await tandaiPengingatDibaca(id)
      setGalat(false)
      queryClient.invalidateQueries({ queryKey: kunci })
    } catch {
      setGalat(true)
    }
  }

  return (
    <section aria-label="Pengingat dari Dosen" className="bg-ivory rounded-2xl border p-4 mb-4" style={{ borderColor: 'var(--terra)' }}>
      <h2 className="font-display text-lg font-semibold text-brown mb-3">Pengingat dari Dosen</h2>
      <ul className="flex flex-col gap-2.5 list-none m-0 p-0">
        {daftar.slice(0, 3).map((p) => (
          <li key={p.id} className="rounded-xl border px-3.5 py-3 flex flex-col gap-1" style={BORDER}>
            <span className="text-sm font-semibold text-brown">{p.title}</span>
            <span className="text-[13px] text-brown-2 whitespace-pre-line">{p.body}</span>
            <span className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-brown-3">{timeAgo(p.createdAt)}</span>
              <button type="button" onClick={() => dibaca(p.id)} className="btn btn-secondary btn-sm">
                Sudah dibaca
              </button>
            </span>
          </li>
        ))}
      </ul>
      {galat && <p className="text-xs mt-2" style={{ color: 'var(--danger)' }}>Gagal menyimpan, coba lagi.</p>}
    </section>
  )
}
