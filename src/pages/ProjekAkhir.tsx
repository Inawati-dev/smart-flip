import { useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { IconDocument, IconDownload, IconTrash, IconCheck, IconClipboard, IconUsers } from '../components/icons'
import {
  BAGIAN_PROPOSAL,
  STATUS_BADGE,
  STATUS_DOSEN,
  STATUS_LABEL,
  ajukanProjek,
  fetchProjekKelas,
  fetchProjekSaya,
  formatProjekDate,
  formatUkuran,
  hapusBerkasProjek,
  hitungKelengkapan,
  nilaiProjek,
  projekKosong,
  rekapStatus,
  simpanProjek,
  unggahBerkasProjek,
  urlBerkasProjek,
  validasiPengajuan,
  type BagianKey,
  type ProjekAkhir as Projek,
  type ProjekStatus,
} from '../lib/projekAkhir'

// Satu rute untuk dua peran — mahasiswa menggarap proposalnya, dosen
// mengontrol dan menilai. Pola percabangan `role` ini sama dengan Draf.tsx
// dan Feedback.tsx, bukan dua rute terpisah, supaya tautan "Projek Akhir"
// di navigasi tetap satu untuk semua orang.

const BORDER = { borderColor: 'var(--border)' } as const

function BadgeStatus({ status }: { status: ProjekStatus }) {
  const b = STATUS_BADGE[status]
  return (
    <span
      className="text-[11px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap inline-block"
      style={{ background: b.bg, color: b.color }}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

export function ProjekAkhir() {
  const { role, profile } = useAuth()
  const isDosen = role === 'dosen'

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5 pb-4 border-b" style={BORDER}>
          <h1 className="font-display text-xl sm:text-2xl font-bold text-brown mb-1">
            {isDosen ? 'Projek Akhir Mahasiswa' : 'Projek Akhir Saya'}
          </h1>
          <p className="text-sm text-brown-3 leading-relaxed">
            {isDosen
              ? 'Pantau dan nilai proposal penelitian & pengembangan yang dikerjakan mahasiswa kelas Anda.'
              : 'Luaran pembelajaran mata kuliah ini: satu proposal penelitian & pengembangan. Boleh diunggah sebagai berkas, ditulis langsung di sini, atau dua-duanya.'}
          </p>
        </div>

        {isDosen ? <PanelDosen /> : <PanelMahasiswa nama={profile?.full_name || 'Mahasiswa'} />}
      </div>
    </Layout>
  )
}

// ══════════════════════════════════════════════
//  TAMPILAN MAHASISWA
// ══════════════════════════════════════════════

function PanelMahasiswa({ nama }: { nama: string }) {
  const { data: projek, isLoading } = useQuery({
    queryKey: ['projek-akhir', 'saya'],
    queryFn: () => fetchProjekSaya(nama),
  })

  // Toast sengaja tinggal di sini, bukan di FormProposal: begitu proposal
  // pertama kali tersimpan, `key` di bawah berubah dan form-nya remount —
  // toast "tersimpan" akan ikut hilang kalau state-nya ada di dalam sana.
  const [toast, setToast] = useState<string | null>(null)
  function tampilkanToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  if (isLoading) {
    return <div className="py-10 text-center text-sm text-brown-3">Memuat projek akhir…</div>
  }

  return (
    <>
      {/* key = id proposal: menyemai isi form dari data server lewat useState
          awal + remount, bukan lewat useEffect yang memanggil setState (pola
          "reset state dengan key"). Karena id-nya tidak berubah saat refetch
          biasa, ketikan yang belum disimpan tidak akan tertimpa data lama. */}
      <FormProposal key={projek?.id ?? 'baru'} projek={projek ?? null} nama={nama} onToast={tampilkanToast} />

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-xl text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

function FormProposal({
  projek,
  nama,
  onToast,
}: {
  projek: Projek | null
  nama: string
  onToast: (msg: string) => void
}) {
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)

  const [judul, setJudul] = useState(projek?.judul ?? '')
  const [isi, setIsi] = useState<Record<BagianKey, string>>({
    ringkasan: projek?.ringkasan ?? '',
    latarBelakang: projek?.latarBelakang ?? '',
    rumusanMasalah: projek?.rumusanMasalah ?? '',
    tujuan: projek?.tujuan ?? '',
    metode: projek?.metode ?? '',
  })
  const [berkasBaru, setBerkasBaru] = useState<File | null>(null)
  const [menyimpan, setMenyimpan] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const [konfirmAjukan, setKonfirmAjukan] = useState(false)
  const [konfirmHapusBerkas, setKonfirmHapusBerkas] = useState(false)
  const [memproses, setMemproses] = useState(false)

  const tampil: Projek = useMemo(() => {
    const dasar = projek ?? projekKosong('', nama)
    return { ...dasar, judul, ...isi }
  }, [projek, judul, isi, nama])

  const kelengkapan = hitungKelengkapan(tampil)
  const penghalang = validasiPengajuan(tampil)
  const terkunci = tampil.status === 'disetujui'

  async function segarkan() {
    await queryClient.invalidateQueries({ queryKey: ['projek-akhir'] })
  }

  async function simpan() {
    setGalat(null)
    setMenyimpan(true)
    try {
      let filePath: string | null | undefined
      let fileName: string | null | undefined
      if (berkasBaru) {
        const hasil = await unggahBerkasProjek(berkasBaru)
        filePath = hasil.path
        fileName = hasil.name
        // Berkas lama jadi yatim begitu kolomnya menunjuk berkas baru — buang
        // supaya bucket tidak menumpuk sisa unggahan yang tak dipakai lagi.
        if (projek?.filePath) await hapusBerkasProjek(projek.filePath)
      }
      await simpanProjek({ judul, ...isi, filePath, fileName }, nama)
      setBerkasBaru(null)
      if (fileRef.current) fileRef.current.value = ''
      await segarkan()
      onToast('Proposal tersimpan')
    } catch {
      setGalat('Gagal menyimpan proposal. Coba lagi sebentar lagi.')
    } finally {
      setMenyimpan(false)
    }
  }

  async function konfirmasiAjukan() {
    if (!projek?.id) return
    setMemproses(true)
    try {
      // Simpan dulu, baru ajukan — kalau tidak, isian terakhir yang belum
      // ditekan "Simpan" tidak ikut terkirim ke dosen.
      await simpanProjek({ judul, ...isi }, nama)
      await ajukanProjek(projek.id)
      await segarkan()
      setKonfirmAjukan(false)
      onToast('Proposal diajukan ke dosen')
    } catch {
      setKonfirmAjukan(false)
      onToast('Gagal mengajukan — coba lagi')
    } finally {
      setMemproses(false)
    }
  }

  async function konfirmasiHapusBerkas() {
    if (!projek?.filePath) return
    setMemproses(true)
    try {
      await hapusBerkasProjek(projek.filePath)
      await simpanProjek({ judul, ...isi, filePath: null, fileName: null }, nama)
      await segarkan()
      setKonfirmHapusBerkas(false)
      onToast('Berkas dihapus')
    } catch {
      setKonfirmHapusBerkas(false)
      onToast('Gagal menghapus berkas')
    } finally {
      setMemproses(false)
    }
  }

  async function bukaBerkas() {
    const url = await urlBerkasProjek(projek?.filePath ?? null)
    if (url) window.open(url, '_blank', 'noopener')
    else onToast('Tautan berkas tidak tersedia')
  }

  return (
    <>
      {/* RINGKASAN STATUS */}
      <div className="bg-ivory border rounded-xl p-4 md:p-5 mb-5" style={BORDER}>
        <div className="flex items-start gap-3 flex-wrap mb-3">
          <div className="flex-1 min-w-[180px]">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">Status</div>
            <BadgeStatus status={tampil.status} />
          </div>
          <div className="text-xs text-brown-3 sm:text-right">
            {tampil.submittedAt && <div>Diajukan {formatProjekDate(tampil.submittedAt)}</div>}
            {tampil.reviewedAt && <div>Ditinjau {formatProjekDate(tampil.reviewedAt)}</div>}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-semibold text-brown-2">Kelengkapan</span>
          <span className="text-xs text-brown-3 tabular-nums ml-auto">{kelengkapan}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg3)' }}>
          <div
            className="h-full rounded-full"
            style={{ width: `${kelengkapan}%`, background: 'var(--terra)', transition: 'width .3s ease' }}
          />
        </div>

        {tampil.catatanDosen && (
          <div
            className="mt-4 px-3.5 py-3 rounded-lg border-l-[3px]"
            style={{ background: '#FEF9F4', borderLeftColor: 'var(--terra)' }}
          >
            <div className="text-xs font-bold text-terra-d mb-1">Catatan Dosen</div>
            <p className="text-sm text-brown-2 leading-relaxed whitespace-pre-wrap break-words">
              {tampil.catatanDosen}
            </p>
          </div>
        )}

        {terkunci && (
          <p className="mt-3 text-xs text-sage-d leading-relaxed">
            Proposal sudah disetujui dosen — isinya dikunci. Hubungi dosen pengampu kalau masih perlu diubah.
          </p>
        )}
      </div>

      {/* BERKAS PROPOSAL */}
      <div className="bg-ivory border rounded-xl p-4 md:p-5 mb-5" style={BORDER}>
        <div className="font-display text-base font-semibold text-brown mb-1 flex items-center gap-2">
          <IconDocument size={18} /> Berkas Proposal
        </div>
        <p className="text-xs text-brown-3 leading-relaxed mb-3.5">
          Unggah dokumen proposal (PDF/DOC/DOCX). Opsional kalau kamu memilih menulis langsung di sistem.
        </p>

        {projek?.fileName && (
          <div
            className="flex items-center gap-2.5 flex-wrap px-3.5 py-3 rounded-lg border mb-3"
            style={{ ...BORDER, background: 'var(--bg3)' }}
          >
            <span className="text-sm text-brown font-medium break-all flex-1 min-w-[140px]">{projek.fileName}</span>
            <button
              onClick={() => void bukaBerkas()}
              className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-lg border text-sm font-semibold text-brown-2"
              style={BORDER}
            >
              <IconDownload size={15} /> Unduh
            </button>
            {!terkunci && (
              <button
                onClick={() => setKonfirmHapusBerkas(true)}
                className="inline-flex items-center gap-1.5 h-11 px-3.5 rounded-lg border text-sm font-semibold"
                style={{ ...BORDER, color: 'var(--red)' }}
              >
                <IconTrash size={15} /> Hapus
              </button>
            )}
          </div>
        )}

        {!terkunci && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf"
              onChange={(e) => setBerkasBaru(e.target.files?.[0] ?? null)}
              className="block w-full text-base md:text-sm text-brown-2 file:mr-3 file:h-11 file:px-4 file:rounded-lg file:border-0 file:bg-cream file:text-brown-2 file:text-sm file:font-semibold file:cursor-pointer"
            />
            {berkasBaru && (
              <p className="text-xs text-brown-3 mt-2 break-all">
                Siap diunggah: {berkasBaru.name} ({formatUkuran(berkasBaru.size)}) — tekan “Simpan Proposal”.
              </p>
            )}
          </>
        )}
      </div>

      {/* TULIS DI SISTEM */}
      <div className="bg-ivory border rounded-xl p-4 md:p-5 mb-5" style={BORDER}>
        <div className="font-display text-base font-semibold text-brown mb-1 flex items-center gap-2">
          <IconClipboard size={18} /> Tulis Proposal di Sistem
        </div>
        <p className="text-xs text-brown-3 leading-relaxed mb-4">
          Isi per bagian. Tidak harus sekaligus — simpan kapan saja, lanjutkan nanti.
        </p>

        <label className="block text-xs font-semibold text-brown-2 mb-4">
          Judul Proposal
          <input
            value={judul}
            onChange={(e) => setJudul(e.target.value)}
            disabled={terkunci}
            maxLength={200}
            placeholder="Pengembangan ... untuk ..."
            className="block w-full mt-1.5 h-11 rounded-lg border px-3 text-base md:text-sm text-brown font-normal disabled:opacity-60"
            style={{ ...BORDER, background: 'var(--bg3)' }}
          />
        </label>

        <div className="flex flex-col gap-4">
          {BAGIAN_PROPOSAL.map((b) => (
            <label key={b.key} className="block text-xs font-semibold text-brown-2">
              {b.label}
              <span className="block font-normal text-brown-3 mt-0.5 leading-relaxed">{b.petunjuk}</span>
              <textarea
                value={isi[b.key]}
                onChange={(e) => setIsi((s) => ({ ...s, [b.key]: e.target.value }))}
                disabled={terkunci}
                rows={4}
                className="block w-full mt-1.5 rounded-lg border px-3 py-2.5 text-base md:text-sm text-brown font-normal resize-y min-h-[96px] disabled:opacity-60"
                style={{ ...BORDER, background: 'var(--bg3)' }}
              />
            </label>
          ))}
        </div>

        {galat && <p className="text-xs text-red mt-3">{galat}</p>}

        {!terkunci && (
          <div className="flex flex-col sm:flex-row gap-2.5 mt-5">
            <button
              onClick={() => void simpan()}
              disabled={menyimpan}
              className="flex-1 min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2 disabled:opacity-50"
              style={BORDER}
            >
              {menyimpan ? 'Menyimpan…' : 'Simpan Proposal'}
            </button>
            <button
              onClick={() => setKonfirmAjukan(true)}
              disabled={menyimpan || !!penghalang || !projek?.id}
              title={penghalang ?? undefined}
              className="flex-1 min-h-11 px-4 rounded-lg text-sm font-semibold disabled:opacity-50"
              style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
            >
              Ajukan ke Dosen
            </button>
          </div>
        )}

        {!terkunci && penghalang && <p className="text-xs text-brown-3 mt-2.5 leading-relaxed">{penghalang}</p>}
        {!terkunci && !penghalang && !projek?.id && (
          <p className="text-xs text-brown-3 mt-2.5 leading-relaxed">
            Simpan dulu sekali supaya proposalnya bisa diajukan ke dosen.
          </p>
        )}
      </div>

      {/* Konfirmasi AJUKAN — submit final, wajib modal sesuai aturan proyek:
          setelah diajukan, dosen langsung melihatnya dan menilai. */}
      {konfirmAjukan && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !memproses) setKonfirmAjukan(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto text-center"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown mb-1.5">Ajukan proposal ke dosen?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Isi proposal yang sekarang akan dikirim untuk ditinjau. Kamu masih bisa memperbaikinya selama
              dosen belum menyetujui.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setKonfirmAjukan(false)}
                disabled={memproses}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void konfirmasiAjukan()}
                disabled={memproses}
                className="flex-1 min-h-11 rounded-lg text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
              >
                {memproses ? 'Mengirim…' : 'Ya, Ajukan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Konfirmasi HAPUS BERKAS — destruktif, berkasnya benar-benar dibuang. */}
      {konfirmHapusBerkas && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !memproses) setKonfirmHapusBerkas(false)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto text-center"
            style={{ animation: 'slideUpModal 0.22s ease' }}
          >
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus berkas proposal?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Berkas “{projek?.fileName}” dibuang permanen dari penyimpanan. Tulisan proposal di sistem tidak
              ikut terhapus. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setKonfirmHapusBerkas(false)}
                disabled={memproses}
                className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void konfirmasiHapusBerkas()}
                disabled={memproses}
                className="flex-1 min-h-11 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
                style={{ background: 'var(--red)' }}
              >
                {memproses ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ══════════════════════════════════════════════
//  TAMPILAN DOSEN
// ══════════════════════════════════════════════

type TabDosen = 'semua' | ProjekStatus

const TABS: Array<{ key: TabDosen; label: string }> = [
  { key: 'semua', label: 'Semua' },
  { key: 'diajukan', label: 'Menunggu Tinjauan' },
  { key: 'revisi', label: 'Perlu Revisi' },
  { key: 'disetujui', label: 'Disetujui' },
  { key: 'draf', label: 'Masih Draf' },
]

function PanelDosen() {
  const queryClient = useQueryClient()
  const { data: daftar = [], isLoading } = useQuery({
    queryKey: ['projek-akhir', 'kelas'],
    queryFn: fetchProjekKelas,
  })

  const [tab, setTab] = useState<TabDosen>('semua')
  const [tinjauId, setTinjauId] = useState<string | null>(null)
  const [statusPilihan, setStatusPilihan] = useState<ProjekStatus>('diajukan')
  const [catatan, setCatatan] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const rekap = useMemo(() => rekapStatus(daftar), [daftar])
  const tersaring = useMemo(
    () => (tab === 'semua' ? daftar : daftar.filter((p) => p.status === tab)),
    [daftar, tab],
  )
  const tinjau = useMemo(() => daftar.find((p) => p.id === tinjauId) ?? null, [daftar, tinjauId])

  function tampilkanToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2600)
  }

  function bukaTinjau(p: Projek) {
    setTinjauId(p.id)
    setStatusPilihan(p.status === 'draf' ? 'diajukan' : p.status)
    setCatatan(p.catatanDosen)
  }

  async function simpanPenilaian() {
    if (!tinjau) return
    setMenyimpan(true)
    try {
      await nilaiProjek(tinjau.id, statusPilihan, catatan.trim())
      await queryClient.invalidateQueries({ queryKey: ['projek-akhir'] })
      setTinjauId(null)
      tampilkanToast('Penilaian tersimpan')
    } catch {
      // nilaiProjek melempar juga saat UPDATE-nya tersaring RLS jadi 0 baris —
      // jangan pernah tampilkan "tersimpan" untuk kasus itu.
      tampilkanToast('Gagal menyimpan penilaian — coba lagi')
    } finally {
      setMenyimpan(false)
    }
  }

  async function unduhBerkas(p: Projek) {
    const url = await urlBerkasProjek(p.filePath)
    if (url) window.open(url, '_blank', 'noopener')
    else tampilkanToast('Tautan berkas tidak tersedia')
  }

  return (
    <>
      {/* KARTU RINGKASAN */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {(
          [
            ['Total Mahasiswa', String(rekap.total), 'text-brown'],
            ['Menunggu Tinjauan', String(rekap.diajukan), 'text-terra-d'],
            ['Perlu Revisi', String(rekap.revisi), 'text-red'],
            ['Disetujui', String(rekap.disetujui), 'text-sage-d'],
          ] as const
        ).map(([label, value, cls]) => (
          <div key={label} className="bg-ivory border rounded-xl p-3.5" style={BORDER}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-brown-3 mb-1">{label}</div>
            <div className={`font-display text-2xl font-bold ${cls}`}>{value}</div>
          </div>
        ))}
      </div>

      {/* TAB FILTER */}
      <div className="flex gap-1 border-b mb-5 overflow-x-auto" style={BORDER}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className="px-3.5 min-h-11 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px"
            style={{
              borderColor: tab === t.key ? 'var(--terra)' : 'transparent',
              // --brown3, bukan --brown-3: nama tak berprefiks di
              // src/lib/design-tokens.ts memang tanpa tanda hubung sebelum
              // angka (--color-brown-3 itu nama versi Tailwind-nya).
              color: tab === t.key ? 'var(--terra-d)' : 'var(--brown3)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="bg-ivory border rounded-xl p-4 md:p-6" style={BORDER}>
        <div className="font-display text-base font-semibold text-brown mb-4 flex items-center gap-2">
          <IconUsers size={18} /> Daftar Projek Akhir
          {isLoading && <span className="text-xs font-normal text-brown-3">Memuat…</span>}
        </div>

        {tersaring.length === 0 ? (
          <div className="text-center py-12 px-4 text-brown-3 text-sm">
            <span className="flex justify-center mb-2">
              <IconClipboard size={28} />
            </span>
            {tab === 'semua'
              ? 'Belum ada mahasiswa yang memulai projek akhir.'
              : 'Tidak ada projek akhir dengan status ini.'}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border" style={BORDER}>
            <table className="w-full border-collapse min-w-[720px]">
              <thead className="bg-cream">
                <tr>
                  {['Mahasiswa', 'Kelas', 'Judul Proposal', 'Berkas', 'Status', 'Diperbarui', ''].map((h, i) => (
                    <th
                      key={h || 'aksi'}
                      className={`px-3 py-2.5 text-xs font-semibold text-brown-2 tracking-wide uppercase ${
                        i <= 2 ? 'text-left' : 'text-center'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tersaring.map((p) => (
                  <tr key={p.id} className="border-b last:border-b-0" style={BORDER}>
                    <td className="px-3 py-2.5 text-sm font-medium text-brown">{p.nama}</td>
                    <td className="px-3 py-2.5 text-sm text-brown-3">{p.kelas ?? '—'}</td>
                    <td className="px-3 py-2.5 text-sm text-brown-2">{p.judul || <em>Belum berjudul</em>}</td>
                    <td className="px-3 py-2.5 text-center">
                      {p.filePath ? (
                        <button
                          onClick={() => void unduhBerkas(p)}
                          className="inline-flex items-center gap-1.5 min-h-11 px-2.5 text-sm text-terra-d font-semibold"
                        >
                          <IconDownload size={15} /> Unduh
                        </button>
                      ) : (
                        <span className="text-xs text-brown-3">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <BadgeStatus status={p.status} />
                    </td>
                    <td className="px-3 py-2.5 text-sm text-center text-brown-3 whitespace-nowrap">
                      {formatProjekDate(p.updatedAt)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() => bukaTinjau(p)}
                        className="min-h-11 px-3.5 rounded-lg text-sm font-semibold whitespace-nowrap"
                        style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
                      >
                        Tinjau
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* PANEL TINJAUAN */}
      {tinjau && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !menyimpan) setTinjauId(null)
          }}
        >
          <div
            className="bg-ivory rounded-2xl p-5 md:p-6 w-full max-w-[680px] max-h-[90vh] overflow-y-auto"
            style={{ boxShadow: '0 16px 48px rgba(44,36,32,.2)', animation: 'slideUpModal 0.22s ease' }}
          >
            <div className="flex items-start gap-3 flex-wrap mb-1">
              <h3 className="font-display text-lg font-semibold text-brown flex-1 min-w-[160px] leading-snug">
                {tinjau.judul || 'Belum berjudul'}
              </h3>
              <BadgeStatus status={tinjau.status} />
            </div>
            <p className="text-xs text-brown-3 mb-4">
              {tinjau.nama}
              {tinjau.kelas ? ` · ${tinjau.kelas}` : ''} · diperbarui {formatProjekDate(tinjau.updatedAt)}
            </p>

            {tinjau.filePath && (
              <button
                onClick={() => void unduhBerkas(tinjau)}
                className="inline-flex items-center gap-1.5 min-h-11 px-4 rounded-lg border text-sm font-semibold text-brown-2 mb-4"
                style={BORDER}
              >
                <IconDownload size={15} /> {tinjau.fileName || 'Unduh berkas'}
              </button>
            )}

            <div className="flex flex-col gap-3.5 mb-5">
              {BAGIAN_PROPOSAL.map((b) => (
                <div key={b.key}>
                  <div className="text-xs font-bold uppercase tracking-wide text-brown-3 mb-1">{b.label}</div>
                  <p className="text-sm text-brown-2 leading-relaxed whitespace-pre-wrap break-words">
                    {tinjau[b.key]?.trim() || <span className="text-brown-3 italic">Belum diisi</span>}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t pt-4" style={BORDER}>
              <label className="block text-xs font-semibold text-brown-2 mb-3">
                Status
                <Select
                  value={statusPilihan}
                  onChange={(v) => setStatusPilihan(v as ProjekStatus)}
                  className="block w-full mt-1.5 h-11 rounded-lg border px-3 text-base md:text-sm text-brown"
                  style={{ ...BORDER, background: 'var(--bg3)' }}
                  options={STATUS_DOSEN.map((s) => ({ value: s, label: STATUS_LABEL[s] }))}
                />
              </label>

              <label className="block text-xs font-semibold text-brown-2 mb-4">
                Catatan untuk Mahasiswa
                <textarea
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  rows={4}
                  placeholder="Bagian mana yang perlu diperbaiki, dan kenapa…"
                  className="block w-full mt-1.5 rounded-lg border px-3 py-2.5 text-base md:text-sm text-brown font-normal resize-y min-h-[96px]"
                  style={{ ...BORDER, background: 'var(--bg3)' }}
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  onClick={() => setTinjauId(null)}
                  disabled={menyimpan}
                  className="flex-1 min-h-11 rounded-lg border text-sm text-brown-2 disabled:opacity-50"
                  style={BORDER}
                >
                  Tutup
                </button>
                <button
                  onClick={() => void simpanPenilaian()}
                  disabled={menyimpan}
                  className="flex-[2] inline-flex items-center justify-center gap-1.5 min-h-11 rounded-lg text-sm font-semibold disabled:opacity-50"
                  style={{ background: 'var(--brown)', color: 'var(--btn-text)' }}
                >
                  <IconCheck size={16} /> {menyimpan ? 'Menyimpan…' : 'Simpan Penilaian'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-xl text-sm font-semibold z-[999]"
          style={{ background: 'var(--brown)', color: 'var(--btn-text)', boxShadow: '0 4px 20px rgba(0,0,0,.2)' }}
        >
          {toast}
        </div>
      )}
    </>
  )
}

export default ProjekAkhir
