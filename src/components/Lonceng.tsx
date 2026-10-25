import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { usePaketMhs } from '../hooks/usePaketMhs'
import { useAmbang } from '../lib/ambang'
import { fetchSumberAktivitas, perluPerhatian, type FilterAktivitas } from '../lib/aktivitas'
import { fetchPengingatSaya, tandaiPengingatDibaca } from '../lib/pengingat'
import { timeAgo } from '../lib/forum'
import { IconBell } from './icons'

// Lonceng notifikasi di kepala halaman (antrean #339; menggantikan pilihan
// "tanpa lonceng" #189). Mahasiswa: pengingat dosen (#338) + kabar Mini
// Projek (#189). Dosen: jumlah mahasiswa Perlu Perhatian, rentang 7 hari
// semua kelas, kunci kueri sama dengan Dashboard dosen supaya datanya dipakai bersama.

export interface ButirLonceng {
  kunci: string
  judul: string
  ket: string
  waktu?: string
  baru: boolean
  buka: () => void
}

/** `letak`: 'rel' = sidebar laptop (panel muncul di kanan rel), 'atas' = kepala telepon (panel di bawah kepala). */
export function Lonceng({ letak }: { letak: 'rel' | 'atas' }) {
  const { role } = useAuth()
  if (role === 'mahasiswa') return <LoncengMhs letak={letak} />
  if (role === 'dosen') return <LoncengDosen letak={letak} />
  return null
}

function LoncengMhs({ letak }: { letak: 'rel' | 'atas' }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const kunciPengingat = ['pengingat-saya', user?.id]
  const { data: pengingat = [] } = useQuery({ queryKey: kunciPengingat, queryFn: () => fetchPengingatSaya(user?.id) })
  const { kabar, baru, tandaiDilihat } = usePaketMhs()
  const kunciBaru = new Set(baru.map((k) => `${k.jenis}-${k.urutan}`))
  const butir: ButirLonceng[] = [
    ...pengingat.map((p) => ({
      kunci: `p-${p.id}`,
      judul: p.title,
      ket: p.body,
      waktu: p.createdAt,
      baru: true,
      buka: () => {
        // Galat tandai dibaca tidak menghalangi pindah halaman; pengingat tetap muncul lagi.
        tandaiPengingatDibaca(p.id).then(() => queryClient.invalidateQueries({ queryKey: kunciPengingat }), () => {})
        navigate('/dashboard')
      },
    })),
    // Semua kabar baru selalu tampil (lencana menghitungnya), ditambah kabar lama sampai 5 butir.
    ...kabar.slice(0, Math.max(5, baru.length)).map((k) => ({
      kunci: `k-${k.jenis}-${k.urutan}`,
      judul: k.judul,
      ket: k.ket,
      waktu: k.waktu,
      baru: kunciBaru.has(`${k.jenis}-${k.urutan}`),
      buka: () => {
        tandaiDilihat()
        navigate('/mini-projek')
      },
    })),
  ]
  return <PanelLonceng letak={letak} butir={butir} jumlahBaru={pengingat.length + baru.length} kosong="Belum ada notifikasi." />
}

function LoncengDosen({ letak }: { letak: 'rel' | 'atas' }) {
  const navigate = useNavigate()
  const { courseId } = useCourse()
  const ambang = useAmbang()
  // Sama persis dengan filter bawaan DosenHome (semua kelas, 7 hari) supaya kueri ['aktivitas', filter] dipakai bersama.
  const filter: FilterAktivitas = { kelasId: 'semua', hari: 7, courseId, passScore: ambang.formatif }
  const { data: sumber } = useQuery({ queryKey: ['aktivitas', filter], queryFn: () => fetchSumberAktivitas(filter) })
  const perhatian = sumber ? perluPerhatian(sumber) : []
  const butir: ButirLonceng[] = perhatian.slice(0, 6).map((p, i) => ({
    kunci: `${p.userId ?? p.judul}-${i}`,
    judul: p.judul,
    ket: p.keterangan,
    baru: true,
    buka: () => navigate('/dashboard?tab=perhatian'),
  }))
  return (
    <PanelLonceng
      letak={letak}
      butir={butir}
      jumlahBaru={perhatian.length}
      kosong="Tidak ada mahasiswa yang perlu diperhatikan (7 hari terakhir)."
      kaki={perhatian.length > 0 ? { label: `Buka Perlu Perhatian (${perhatian.length})`, buka: () => navigate('/dashboard?tab=perhatian') } : undefined}
    />
  )
}

export function PanelLonceng({
  letak,
  butir,
  jumlahBaru,
  kosong,
  kaki,
}: {
  letak: 'rel' | 'atas'
  butir: ButirLonceng[]
  jumlahBaru: number
  kosong: string
  kaki?: { label: string; buka: () => void }
}) {
  const [buka, setBuka] = useState(false)
  const akar = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!buka) return
    const luar = (e: MouseEvent) => { if (!akar.current?.contains(e.target as Node)) setBuka(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setBuka(false) }
    document.addEventListener('mousedown', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [buka])

  const label = jumlahBaru > 0 ? `Notifikasi, ${jumlahBaru} baru` : 'Notifikasi'
  const tombolKelas =
    letak === 'rel'
      ? 'w-10 h-10 rounded-[var(--radius-control)] hover:bg-bg3'
      : 'w-11 h-11 rounded-full border border-[color:var(--border)]'
  // Rel laptop di kiri bawah: panel di kanan rel, rata bawah. Telepon: panel penuh lebar di bawah kepala 58 px.
  const panelKelas =
    letak === 'rel'
      ? 'fixed left-[88px] bottom-4 w-[360px]'
      : 'fixed left-4 right-4 top-[66px]'

  function pilih(b: ButirLonceng) {
    setBuka(false)
    b.buka()
  }

  return (
    <div ref={akar} className="relative">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        title={label}
        aria-label={label}
        aria-expanded={buka}
        aria-haspopup="dialog"
        data-tur="lonceng"
        className={`${tombolKelas} relative flex items-center justify-center text-brown-2 transition-colors`}
      >
        <IconBell size={18} />
        {jumlahBaru > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold leading-[18px] text-center tabular-nums"
            style={{ background: 'var(--danger)', color: 'var(--btn-text)', boxShadow: '0 0 0 2px var(--cream)' }}
            aria-hidden
          >
            {jumlahBaru > 9 ? '9+' : jumlahBaru}
          </span>
        )}
      </button>
      {buka && (
        <div
          role="dialog"
          aria-label="Notifikasi"
          className={`${panelKelas} z-[500] rounded-2xl border border-[color:var(--border)] bg-ivory flex flex-col max-h-[min(480px,75dvh)]`}
          style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--shadow-color) 20%, transparent)', animation: 'slideUpModal 0.2s ease' }}
        >
          <p className="px-4 pt-3.5 pb-2 text-[11px] font-semibold uppercase tracking-wide text-brown-3">Notifikasi</p>
          {butir.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-brown-3">{kosong}</p>
          ) : (
            <ul className="list-none m-0 px-2 pb-2 overflow-y-auto flex flex-col gap-1">
              {butir.map((b) => (
                <li key={b.kunci}>
                  <button
                    type="button"
                    onClick={() => pilih(b)}
                    className="w-full text-left rounded-xl px-3 py-2.5 min-h-11 flex gap-2.5 hover:bg-bg3 transition-colors"
                  >
                    <span
                      className="mt-1.5 w-2 h-2 rounded-full shrink-0"
                      style={{ background: b.baru ? 'var(--danger)' : 'transparent' }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex flex-col gap-0.5">
                      <span className="text-sm font-semibold text-brown">
                        {b.baru && <span className="sr-only">Baru: </span>}
                        {b.judul}
                      </span>
                      <span className="text-[13px] text-brown-2 whitespace-pre-line line-clamp-3">{b.ket}</span>
                      {b.waktu && <span className="text-xs text-brown-3">{timeAgo(b.waktu)}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {kaki && (
            <button type="button" onClick={() => { setBuka(false); kaki.buka() }} className="btn btn-secondary btn-sm mx-3 mb-3">
              {kaki.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
