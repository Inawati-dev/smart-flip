import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { usePaketMhs } from '../hooks/usePaketMhs'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useTopikStatus } from '../lib/topik'
import { fetchVideoProgressMap } from '../lib/videoProgress'
import { notifikasiBelajar, ringkasProgres } from '../lib/notifBelajar'
import { useAmbang } from '../lib/ambang'
import { useNotifAktif, useJenisNotif, JENIS_NOTIF } from '../lib/notifPref'
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
  // Notifikasi belajar (antrean #353): dihitung dari progres baca, tonton, dan jadwal; tanpa tabel baru.
  const { data: modules = [] } = useModules()
  const { statusOf, bukaPada, formatifPada, loading } = useTopikStatus()
  const { data: progress = {} } = useAllProgress()
  const { data: video = {} } = useQuery({ queryKey: ['video-progress'], queryFn: fetchVideoProgressMap })
  const belajar = useMemo(
    () =>
      loading
        ? []
        : notifikasiBelajar({
            modulesUrut: [...modules].sort((a, b) => a.order_num - b.order_num),
            statusOf,
            progress,
            video,
            bukaPada,
            formatifPada,
            kini: new Date(),
          }),
    [loading, modules, statusOf, progress, video, bukaPada, formatifPada],
  )
  // Baris ringkasan progres paling atas (angket butir 12, antrean #368): bukan kabar baru, jadi tidak menambah lencana.
  const urut = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const progres = loading ? null : ringkasProgres(urut, statusOf)
  // Saklar per jenis (angket butir 14, antrean #370): jenis yang dimatikan tidak tampil dan tidak masuk lencana.
  const { jenis: pilih } = useJenisNotif()
  const belajarTampil = belajar.filter((b) => (b.jenis === 'jadwal' ? pilih.jadwal : pilih.belajar))
  const butir: ButirLonceng[] = [
    ...(progres && progres.total > 0 && pilih.belajar
      ? [{ kunci: 'progres', judul: `Progres belajar ${progres.persen}% selesai`, ket: `${progres.selesai} dari ${progres.total} topik lulus tes formatif`, baru: false, buka: () => navigate('/modul') }]
      : []),
    ...(pilih.pengingat ? pengingat : []).map((p) => ({
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
    ...belajarTampil.map((b) => ({ kunci: `b-${b.kunci}`, judul: b.judul, ket: b.ket, baru: true, buka: () => navigate(b.tautan) })),
    // Semua kabar baru selalu tampil (lencana menghitungnya), ditambah kabar lama sampai 5 butir.
    ...(pilih.mini ? kabar : []).slice(0, Math.max(5, baru.length)).map((k) => ({
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
  return <PanelLonceng letak={letak} butir={butir} jumlahBaru={(pilih.pengingat ? pengingat.length : 0) + belajarTampil.length + (pilih.mini ? baru.length : 0)} kosong="Belum ada notifikasi." pilihJenis />
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

/** Lintasan dan bola saklar (40 x 24 px, celah sama di semua sisi; antrean #362). */
function TrekSaklar({ aktif }: { aktif: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative w-10 h-6 shrink-0 box-border rounded-full border border-[color:var(--border)] transition-colors"
      style={{ background: aktif ? 'var(--terra)' : 'var(--bg3)' }}
    >
      <span
        className="absolute top-[3px] left-[3px] w-4 h-4 rounded-full transition-transform"
        style={{ background: aktif ? 'var(--btn-text)' : 'var(--brown3)', transform: aktif ? 'translateX(16px)' : 'none' }}
      />
    </span>
  )
}

export function PanelLonceng({
  letak,
  butir,
  jumlahBaru,
  kosong,
  kaki,
  pilihJenis = false,
}: {
  letak: 'rel' | 'atas'
  butir: ButirLonceng[]
  jumlahBaru: number
  kosong: string
  kaki?: { label: string; buka: () => void }
  /** Tampilkan "Pilih jenis notifikasi" (saklar per jenis); hanya untuk mahasiswa. */
  pilihJenis?: boolean
}) {
  const [buka, setBuka] = useState(false)
  const { aktif, setAktif } = useNotifAktif()
  const { jenis: pilihan, setJenis } = useJenisNotif()
  const akar = useRef<HTMLDivElement>(null)
  const tombol = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)

  // Fokus keyboard (antrean #343): saat dibuka pindah ke butir pertama (tanpa butir: tombol kaki, lalu panel);
  // Esc dan pilih butir mengembalikannya ke tombol lonceng. Klik di luar tidak memindah fokus.
  function tutup(kembalikanFokus: boolean) {
    setBuka(false)
    if (kembalikanFokus) tombol.current?.focus()
  }

  useEffect(() => {
    if (!buka) return
    const p = panel.current
    // Saklar ada di kepala panel; fokus awal tetap butir pertama, lalu tombol kaki (.btn), baru panel.
    ;(p?.querySelector<HTMLElement>('li button') ?? p?.querySelector<HTMLElement>('.btn') ?? p)?.focus()
  }, [buka])

  useEffect(() => {
    if (!buka) return
    const luar = (e: MouseEvent) => { if (!akar.current?.contains(e.target as Node)) setBuka(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') tutup(true) }
    document.addEventListener('mousedown', luar)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', luar)
      document.removeEventListener('keydown', esc)
    }
  }, [buka])

  const baru = aktif ? jumlahBaru : 0
  const label = !aktif ? 'Notifikasi dimatikan' : baru > 0 ? `Notifikasi, ${baru} baru` : 'Notifikasi'
  const tombolKelas =
    letak === 'rel'
      ? 'w-10 h-10 rounded-[var(--radius-control)] hover:bg-bg3'
      : 'w-11 h-11 rounded-xl border border-[color:var(--border)]'
  // Rel laptop (lonceng di bawah avatar Akun, antrean #378): panel di kanan rel, rata bawah, tumbuh ke atas. Telepon: panel penuh lebar di bawah kepala 58 px.
  const panelKelas =
    letak === 'rel'
      ? 'fixed left-[88px] bottom-4 w-[360px]'
      : 'fixed left-4 right-4 top-[66px]'

  function pilih(b: ButirLonceng) {
    tutup(true)
    b.buka()
  }

  return (
    <div ref={akar} className="relative">
      <button
        ref={tombol}
        type="button"
        onClick={() => setBuka((v) => !v)}
        title={label}
        aria-label={label}
        aria-expanded={buka}
        aria-haspopup="dialog"
        data-tur="lonceng"
        className={`${tombolKelas} relative flex items-center justify-center text-brown-2 transition-colors`}
      >
        <IconBell size={18} className={aktif ? undefined : 'opacity-40'} />
        {baru > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[11px] font-bold leading-[18px] text-center tabular-nums"
            style={{ background: 'var(--danger)', color: 'var(--btn-text)', boxShadow: '0 0 0 2px var(--cream)' }}
            aria-hidden
          >
            {baru > 9 ? '9+' : baru}
          </span>
        )}
      </button>
      {buka && (
        <div
          ref={panel}
          tabIndex={-1}
          role="dialog"
          aria-label="Notifikasi"
          className={`${panelKelas} z-[500] outline-none rounded-2xl border border-[color:var(--border)] bg-ivory flex flex-col max-h-[min(480px,75dvh)]`}
          style={{ boxShadow: '0 8px 32px color-mix(in srgb, var(--shadow-color) 20%, transparent)', animation: 'slideUpModal 0.2s ease' }}
        >
          <div className="px-4 pt-3 pb-1 flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brown-3">Notifikasi</p>
            <button
              type="button"
              role="switch"
              aria-checked={aktif}
              aria-label={aktif ? 'Matikan notifikasi' : 'Nyalakan notifikasi'}
              onClick={() => setAktif(!aktif)}
              className="inline-flex items-center gap-2.5 min-h-11 -my-1.5 pl-2 text-xs font-semibold text-brown-2 rounded-lg focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
            >
              {aktif ? 'Nyala' : 'Mati'}
              <TrekSaklar aktif={aktif} />
            </button>
          </div>
          {pilihJenis && aktif && (
            <details className="px-4 pb-1 group">
              <summary className="cursor-pointer list-none text-xs font-semibold text-terra min-h-9 flex items-center gap-1 rounded-lg focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]">
                Pilih jenis notifikasi
                <span aria-hidden="true" className="transition-transform group-open:rotate-90">›</span>
              </summary>
              <div className="flex flex-col pt-1 pb-1">
                {JENIS_NOTIF.map((j) => (
                  <button
                    key={j.kunci}
                    type="button"
                    role="switch"
                    aria-checked={pilihan[j.kunci]}
                    onClick={() => setJenis(j.kunci, !pilihan[j.kunci])}
                    className="flex items-center justify-between gap-3 min-h-11 text-left text-[13px] text-brown-2 rounded-lg focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
                  >
                    <span>{j.label}</span>
                    <TrekSaklar aktif={pilihan[j.kunci]} />
                  </button>
                ))}
              </div>
            </details>
          )}
          {!aktif ? (
            <p className="px-4 pb-4 pt-1 text-sm text-brown-3">Notifikasi dimatikan. Lencana dan kabar baru tidak ditampilkan. Nyalakan lagi kapan saja lewat saklar di atas.</p>
          ) : butir.length === 0 ? (
            <p className="px-4 pb-4 text-sm text-brown-3">{kosong}</p>
          ) : (
            <ul className="list-none m-0 px-2 pb-2 overflow-y-auto flex flex-col gap-1">
              {butir.map((b) => (
                <li key={b.kunci}>
                  <button
                    type="button"
                    onClick={() => pilih(b)}
                    className="w-full text-left rounded-xl px-3 py-2.5 min-h-11 flex gap-2.5 hover:bg-bg3 transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--accent-soft)]"
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
          {aktif && kaki && (
            <button type="button" onClick={() => { tutup(true); kaki.buka() }} className="btn btn-secondary btn-sm mx-3 mb-3">
              {kaki.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
