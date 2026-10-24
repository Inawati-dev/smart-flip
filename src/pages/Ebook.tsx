import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { saveProgress, tambahWaktuBaca, moduleIdToPath, fetchCatatanTopik, terjauhLama, majuTerjauh, persenBaca, MIN_DETIK_PER_HALAMAN, MAKS_DETIK_PER_HALAMAN, type CatatanTopik } from '../lib/progress'
import { useModules } from '../hooks/useModules'
import { Layout } from '../components/Layout'
import { SampulTopik } from '../components/KartuTopik'
import { PembacaPdf, useCapAir, type StatusPdf } from '../components/PembacaPdf'
import { IconWarning, IconBook, IconChevronRight } from '../components/icons'
import { labelNomor } from '../lib/jenisTopik'

// Halaman Ebook mahasiswa (antrean #148, #166). Pembaca PDF selayar penuhnya
// ada di components/PembacaPdf.tsx dan dipakai juga oleh pratinjau dosen;
// di sini tinggal katalog, kop, keadaan memuat/galat, dan penyimpanan progres.
//
// ?book= membawa id topik, bukan alamat berkasnya; sumber PDF diambil dari
// useModules() supaya alamat penyimpanan tidak tampil di bilah alamat.
const TIDAK_ADA = 'PDF topik ini belum tersedia.\nFile akan ditambahkan segera.'

// Catatan baca satu topik (antrean #191, pilihan B). Posisi baca disimpan seketika supaya "Lanjutkan Membaca"
// tetap tepat. Persen baru naik sesudah halaman tampil MIN_DETIK_PER_HALAMAN detik (tab terlihat) dan merupakan
// lanjutan dari halaman terjauh, jadi membalik cepat tidak dihitung membaca. Persen yang ditulis tidak pernah
// lebih kecil dari yang tersimpan. Waktu baca dijumlahkan per halaman (dibatasi MAKS_DETIK_PER_HALAMAN).
// Catatan lama dibaca langsung tiap pembaca dibuka; selama belum terbaca (atau gagal dibaca), tidak ada yang
// ditulis, supaya angka lama tidak tertimpa.
// Dua tab atau dua perangkat pada topik yang sama dijaga di basis data (migration_v38): angka dan status tidak bisa turun.
function useCatatBaca(moduleId: number | null) {
  const qc = useQueryClient()
  // disimpan bersama id topiknya, supaya angka topik lama tidak tampil sesaat di topik baru
  const [tercatat, setTercatat] = useState<{ id: number; pct: number } | null>(null)
  const st = useRef({
    id: null as number | null,
    lama: null as CatatanTopik | null,
    memuat: false,
    terjauh: 0,
    halaman: 0,
    total: 0,
    sejak: 0,
    detik: 0,
    dikirim: 0,
    tertunda: false,
    timer: undefined as ReturnType<typeof setTimeout> | undefined,
  })

  const simpan = useCallback(() => {
    const s = st.current
    if (moduleId == null || s.total <= 0 || s.halaman <= 0) return
    if (!s.lama) {
      s.tertunda = true
      return
    }
    s.tertunda = false
    s.terjauh = Math.max(s.terjauh, terjauhLama(s.lama, s.total))
    const pct = Math.max(s.lama.pct, persenBaca(s.terjauh, s.total))
    Object.assign(s.lama, { pct, furthestPage: s.terjauh, totalPages: s.total })
    setTercatat({ id: moduleId, pct })
    // Waktu dikirim sebagai selisih sejak kiriman terakhir (migration_v43) supaya dua tab dijumlah, bukan diambil yang terbesar.
    // Selisih dianggap terkirim sebelum jawaban datang agar simpan beruntun tidak mengirimnya dua kali; gagal = dikembalikan.
    const total = Math.round(s.detik)
    const selisih = total - s.dikirim
    s.dikirim = total
    const { lama, halaman, total: jumlah, terjauh } = s
    void (async () => {
      let mutlak = false // fungsi v43 belum ada: cara lama, kirim angka mutlak
      if (selisih > 0) {
        try {
          mutlak = !(await tambahWaktuBaca(moduleId, selisih))
        } catch {
          if (s.id === moduleId) s.dikirim -= selisih
        }
      }
      await saveProgress(moduleIdToPath(moduleId), {
        pct,
        currentPage: halaman,
        totalPages: jumlah,
        lastOpened: new Date().toISOString(),
        ...(mutlak ? { timeSpent: lama.timeSpent + total } : {}),
        furthestPage: terjauh,
      })
    })().catch(() => {})
  }, [moduleId])

  const tutupHalaman = useCallback(() => {
    const s = st.current
    if (s.sejak) s.detik += Math.min(MAKS_DETIK_PER_HALAMAN, (Date.now() - s.sejak) / 1000)
    s.sejak = 0
  }, [])

  // Hitungan 5 detik untuk halaman yang sedang tampil; dipasang ulang tiap halaman berganti, tab kembali terlihat, atau catatan lama selesai dibaca.
  const pasangTimer = useCallback(() => {
    const s = st.current
    clearTimeout(s.timer)
    const halaman = s.halaman
    if (halaman <= 0) return
    s.timer = setTimeout(() => {
      if (document.visibilityState !== 'visible' || !s.lama || s.halaman !== halaman) return
      const lama = Math.max(s.terjauh, terjauhLama(s.lama, s.total))
      s.terjauh = majuTerjauh(lama, halaman, MIN_DETIK_PER_HALAMAN)
      if (s.terjauh !== lama) simpan()
    }, MIN_DETIK_PER_HALAMAN * 1000)
  }, [simpan])

  const muatLama = useCallback(() => {
    const s = st.current
    const id = moduleId
    if (id == null || s.lama || s.memuat) return
    s.memuat = true
    fetchCatatanTopik(id)
      .then((c) => {
        if (s.id !== id) return
        s.memuat = false
        s.lama = c
        setTercatat({ id, pct: c.pct })
        if (s.tertunda) simpan()
        pasangTimer()
      })
      .catch(() => {
        if (s.id === id) s.memuat = false // dicoba lagi saat halaman berikutnya tampil
      })
  }, [moduleId, simpan, pasangTimer])

  useEffect(() => {
    const s = st.current
    Object.assign(s, { id: moduleId, lama: null, memuat: false, terjauh: 0, halaman: 0, total: 0, sejak: 0, detik: 0, dikirim: 0, tertunda: false })
    if (moduleId == null) return
    muatLama()
    return () => {
      clearTimeout(s.timer)
      tutupHalaman()
      simpan()
      void qc.invalidateQueries({ queryKey: ['progress'] })
    }
  }, [moduleId, muatLama, simpan, tutupHalaman, qc])

  // Tab tersembunyi: hitungan berhenti dan waktu disimpan. Tab terlihat lagi: hitungan halaman itu mulai dari awal.
  useEffect(() => {
    const ubah = () => {
      const s = st.current
      if (s.halaman <= 0) return
      if (document.visibilityState === 'visible') {
        s.sejak = Date.now()
        pasangTimer()
      } else {
        clearTimeout(s.timer)
        tutupHalaman()
        simpan()
      }
    }
    document.addEventListener('visibilitychange', ubah)
    return () => document.removeEventListener('visibilitychange', ubah)
  }, [pasangTimer, simpan, tutupHalaman])

  const onHalaman = useCallback(
    (halaman: number, total: number) => {
      const s = st.current
      tutupHalaman()
      if (total !== s.total) s.terjauh = 0 // PDF diganti dengan jumlah halaman lain: hitung ulang dari persen tersimpan
      s.halaman = halaman
      s.total = total
      s.sejak = document.visibilityState === 'visible' ? Date.now() : 0
      muatLama()
      simpan()
      pasangTimer()
    },
    [muatLama, pasangTimer, simpan, tutupHalaman],
  )
  return { onHalaman, tercatat: tercatat && tercatat.id === moduleId ? tercatat.pct : null }
}

export function Ebook() {
  const [searchParams, setSearchParams] = useSearchParams()
  const bookId = searchParams.get('book')
  // A non-numeric bookId (stale bookmark, typo) must collapse cleanly to
  // null — otherwise Number(bookId) === NaN is falsy in some checks below
  // (!moduleId) but "present" in others (moduleId != null, since NaN isn't
  // null/undefined), letting the catalog grid and the loading spinner both
  // render at once with no error shown.
  const parsedModuleId = bookId ? Number(bookId) : NaN
  const moduleId = Number.isFinite(parsedModuleId) ? parsedModuleId : null
  const { data: modules = [] } = useModules()
  const catalog = useMemo(() => modules.filter((m) => !!(m.path || m.pdf_path)), [modules])
  // Label "Topik 01"/"Bagian I" dihitung dari daftar lengkap, bukan hanya yang ber-PDF (antrean #321).
  const urutSemua = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const currentModule = moduleId != null ? modules.find((m) => m.id === moduleId) : undefined
  const src = currentModule?.path || currentModule?.pdf_path || ''
  const cap = useCapAir()
  const catatBaca = useCatatBaca(moduleId)

  // Keadaan muat dilaporkan PembacaPdf bersama id topiknya. Saat ?book= berganti,
  // render pertama masih membawa laporan buku lama; id yang tidak cocok dianggap "memuat".
  const [laporan, setLaporan] = useState<{ id: number | null; status: StatusPdf; pesan: string }>({ id: null, status: 'loading', pesan: '' })
  const laporanIni = laporan.id === moduleId ? laporan : null
  // Modul belum termuat dari useModules() = masih memuat; modul termuat tanpa PDF = galat.
  const tanpaPdf = moduleId != null && !src && modules.length > 0
  const memuat = moduleId != null && !tanpaPdf && (!src || !laporanIni || laporanIni.status === 'loading')
  const galat = tanpaPdf ? TIDAK_ADA : moduleId != null && src && laporanIni?.status === 'error' ? laporanIni.pesan : null
  const siap = moduleId != null && !!src && laporanIni?.status === 'ready'

  return (
    <Layout>
      <div className="flex flex-col items-center p-4 md:p-8 gap-4 min-h-[calc(100vh-58px)] lg:min-h-screen">
        {/* Lebar kop mengikuti konten di bawahnya: katalog w-full, pembaca max-w-4xl. */}
        {/* Satu baris (antrean #149): remah roti di kiri berakhir di judul topik,
            tombol kembali di kanan. Judul topik sekaligus h1 halaman. */}
        <div className={`w-full flex items-center justify-between gap-3 flex-wrap ${moduleId != null ? 'max-w-4xl' : ''} ${siap ? 'hidden' : ''}`}>
          <div className="flex items-center gap-1.5 text-xs text-brown-3 min-w-0">
            <Link to="/modul" className="hover:underline flex-shrink-0">Modul</Link>
            <IconChevronRight size={12} className="flex-shrink-0" />
            <div className="text-xs font-semibold text-brown truncate" role="heading" aria-level={1}>
              {moduleId != null && currentModule?.title ? (
                <Link to={`/modul/${moduleId}`} className="hover:underline">
                  {currentModule.title}
                </Link>
              ) : (
                'Ebook'
              )}
            </div>
          </div>
          <Link to={moduleId != null ? '/modul' : '/dashboard'} className="btn btn-secondary flex-shrink-0">
            ← {moduleId != null ? 'Modul' : 'Kembali ke Dashboard'}
          </Link>
        </div>

        {moduleId == null && (
          // Full width here on purpose, unlike the reader below -- browsing
          // a grid of cover cards benefits from more columns on a wide
          // screen; reading one document does not (that's why the reader
          // view further down keeps its own max-w-4xl).
          <div className="w-full">
            <div
              className="w-full max-w-[220px] bg-ivory rounded-2xl border p-4 mb-4 flex items-center gap-3"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-terra" style={{ background: 'var(--accent-soft)' }}>
                <IconBook size={19} />
              </div>
              <div>
                <div className="text-lg font-bold text-brown leading-tight">
                  {catalog.length}/{modules.length}
                </div>
                <div className="text-xs text-brown-3">Topik Sudah Diunggah</div>
              </div>
            </div>
            {catalog.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <IconBook size={36} className="text-brown-3" />
                <p className="text-sm text-brown-3">Belum ada PDF topik yang terpasang.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {catalog.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSearchParams({ book: String(m.id) })}
                    aria-label={`Buka ${labelNomor(urutSemua, urutSemua.findIndex((x) => x.id === m.id), false)}: ${m.title}`}
                    className="block w-full text-left rounded-[4px_10px_10px_4px] transition-transform hover:-translate-y-0.5"
                  >
                    <SampulTopik nomor={m.order_num} labelNomor={labelNomor(urutSemua, urutSemua.findIndex((x) => x.id === m.id))} judul={m.title} keterangan="PDF" adaPdf pdf={m.pdf_path} />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {memuat && (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-16" role="status">
            <div
              className="w-12 h-12 rounded-full animate-spin"
              style={{ border: '4px solid var(--border)', borderTopColor: 'var(--terra)' }}
            />
            <p className="text-sm text-brown-3">Membuka PDF…</p>
          </div>
        )}

        {galat && (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-center max-w-sm">
            <IconWarning size={40} className="text-danger" />
            <p className="text-sm text-brown-2 whitespace-pre-line">{galat}</p>
            <Link to="/modul" className="btn btn-primary mt-2">
              Kembali ke Modul
            </Link>
          </div>
        )}

        {moduleId != null && src && (
          <PembacaPdf
            key={moduleId}
            src={src}
            judul={currentModule?.title || 'Ebook'}
            cap={cap}
            tampilStatus={false}
            onStatus={(status, pesan) => setLaporan((l) => (l.id === moduleId && l.status === status && l.pesan === pesan ? l : { id: moduleId, status, pesan }))}
            // Progres per halaman, dikunci ke moduleIdToPath() (bukan alamat PDF) supaya
            // sama saja untuk berkas di books/ maupun yang diunggah ke Supabase Storage.
            onHalaman={catatBaca.onHalaman}
            persenTercatat={catatBaca.tercatat}
            kiri={
              <>
                <Link to="/modul" className="hover:underline flex-shrink-0 pembaca-redup">Modul</Link>
                <IconChevronRight size={12} className="flex-shrink-0 pembaca-redup" />
                <h1 className="text-xs font-semibold truncate">
                  <Link to={`/modul/${moduleId}`} className="hover:underline">
                    {currentModule?.title || 'Ebook'}
                  </Link>
                </h1>
              </>
            }
            aksi={
              <Link to="/modul" className="pembaca-tb">
                ← Modul
              </Link>
            }
          />
        )}
      </div>
    </Layout>
  )
}

export default Ebook
