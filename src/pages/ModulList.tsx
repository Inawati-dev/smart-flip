import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useModules } from '../hooks/useModules'
import { useAllProgress } from '../hooks/useProgress'
import { useAuth } from '../contexts/AuthContext'
import { useCourse } from '../contexts/CourseContext'
import { createCourse, updateCourse, deleteCourse, type Course } from '../lib/courses'
import { useTopikStatus } from '../lib/topik'
import { moduleIdToPath, halamanTerjauh } from '../lib/progress'
import { useModulCustoms } from '../hooks/useManajemen'
import {
  saveModulOrder,
  saveModulCustom,
  createModulReturningId,
  deleteModul,
  uploadModulPdf,
  listModulPdfFiles,
  assignModulPdf,
  type ModulCustom,
} from '../lib/manajemen'
import { isSupabaseConfigured } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { Select } from '../components/Select'
import { MataKuliahSelect } from '../components/MataKuliahSelect'
import { IconTrash, IconDocument, IconUpload, IconEdit } from '../components/icons'
import { ModalBerkas, LangkahBerkas, ZonaBerkas, BilahUnggah, LencanaSiap, ukuranBerkas } from '../components/ModalBerkas'
import { PdfPreviewLink } from '../components/PdfPreviewLink'
import { PembacaPdf, useCapAir } from '../components/PembacaPdf'
import { KartuTopik, ChipRak, Rak, MenuAksi, ItemMenu } from '../components/KartuTopik'
import { UrutkanTopikModal, useSeretTopik } from '../components/UrutkanTopik'
import { useAmbang } from '../lib/ambang'
import { formatTanggal, tanggalLokal, labelPertemuan } from '../lib/jadwal'
import { JadwalModal } from '../components/JadwalModal'
import { WatermarkModal, LABEL_CAP, pilihanCap } from '../components/WatermarkModal'
import { fetchModules } from '../lib/modules'

const BORDER = { borderColor: 'var(--border)' } as const
const BORDER_BG = { background: 'var(--border)' } as const

// Pembaca PDF selayar penuh untuk satu alamat (pratinjau kartu dan "Lihat semua halaman").
// Tanpa penyimpanan progres; watermark mengikuti setelan mata kuliah, seperti PdfPreviewLink.
function PratinjauLapis({ url, judul, onTutup }: { url: string; judul: string; onTutup: () => void }) {
  const cap = useCapAir()
  return (
    <PembacaPdf
      src={url}
      judul={judul}
      cap={cap}
      diAtasModal
      onEscape={onTutup}
      kiri={<span className="text-sm font-semibold truncate" title={judul}>{judul}</span>}
      aksi={
        <button type="button" onClick={onTutup} className="pembaca-tb on">
          Tutup
        </button>
      }
    />
  )
}

// Pratinjau berkas yang baru dipilih di kolom kiri modal unggah (antrean #292,
// tata letak #303 opsi A): halaman pertama digambar ke canvas dari object URL,
// jumlah halaman dilaporkan ke pemanggil, dan tombol membuka semua halaman.
export function PratinjauBerkas({ file, onHalaman }: { file: File; onHalaman?: (n: number) => void }) {
  const kanvas = useRef<HTMLCanvasElement>(null)
  const [url, setUrl] = useState<string | null>(null)
  const [gagal, setGagal] = useState(false)
  const [semua, setSemua] = useState(false)
  const [halaman, setHalaman] = useState<number | null>(null)
  const laporHalaman = useRef(onHalaman)
  laporHalaman.current = onHalaman
  useEffect(() => {
    const u = URL.createObjectURL(file)
    let batal = false
    // Render yang masih berjalan dibatalkan saat berkas diganti, supaya render
    // baru ke kanvas yang sama tidak bertabrakan dan tampil "gagal".
    let tugas: { cancel: () => void } | null = null
    setUrl(u)
    setGagal(false)
    setSemua(false)
    setHalaman(null)
    void (async () => {
      try {
        const [pdfjs, pekerja] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.js?url')])
        pdfjs.GlobalWorkerOptions.workerSrc = pekerja.default
        const doc = await pdfjs.getDocument(u).promise
        try {
          if (!batal) {
            setHalaman(doc.numPages)
            laporHalaman.current?.(doc.numPages)
          }
          const hal = await doc.getPage(1)
          const dasar = hal.getViewport({ scale: 1 })
          const viewport = hal.getViewport({ scale: (270 / dasar.width) * (window.devicePixelRatio || 1) })
          const c = kanvas.current
          const ctx = c?.getContext('2d')
          if (batal || !c || !ctx) return
          c.width = viewport.width
          c.height = viewport.height
          const render = hal.render({ canvasContext: ctx, viewport })
          tugas = render
          await render.promise
        } finally {
          doc.destroy().catch(() => {})
        }
      } catch {
        if (!batal) setGagal(true)
      }
    })()
    return () => {
      batal = true
      tugas?.cancel()
      URL.revokeObjectURL(u)
    }
  }, [file])
  return (
    <div className="w-full flex flex-col items-center gap-3" data-testid="pratinjau-berkas">
      <span className="self-start text-[11px] font-semibold uppercase tracking-wide text-brown-3">Pratinjau halaman 1</span>
      {gagal ? (
        <p className="text-xs text-brown-3 py-8 text-center">Pratinjau halaman pertama tidak bisa ditampilkan.</p>
      ) : (
        <canvas
          ref={kanvas}
          aria-label="Halaman pertama berkas yang dipilih"
          className="block w-full max-w-[160px] md:max-w-[270px] h-auto rounded-md bg-ivory"
          style={{ boxShadow: '0 10px 28px color-mix(in srgb, var(--shadow-color) 16%, transparent)' }}
        />
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {halaman != null && (
          <span className="px-3 py-1 rounded-full border bg-ivory text-[13px] font-semibold text-brown tabular-nums" style={BORDER}>{halaman} halaman</span>
        )}
        <span className="px-3 py-1 rounded-full border bg-ivory text-[13px] text-brown-3 tabular-nums" style={BORDER}>{ukuranBerkas(file.size)}</span>
      </div>
      <button type="button" onClick={() => setSemua(true)} disabled={!url} className="btn btn-secondary w-full">
        Lihat semua halaman
      </button>
      {semua && url && <PratinjauLapis url={url} judul={file.name} onTutup={() => setSemua(false)} />}
    </div>
  )
}

/** Kolom kiri modal unggah sebelum berkas dipilih. */
function KosongPratinjau({ teks }: { teks: string }) {
  return (
    <div className="w-full flex flex-col items-center gap-3 py-6 md:py-16 text-center">
      <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-brown-3 bg-ivory border" style={BORDER}>
        <IconDocument size={26} />
      </span>
      <p className="text-sm text-brown-3 max-w-[220px]">{teks}</p>
    </div>
  )
}

// Tabel kelola modul dosen — dipakai di /modul (daftar) dan /modul/:id (spec
// §5.2, §9 WP5). Pola upload/ubah metadata ditiru dari Manajemen.tsx,
// disederhanakan (tanpa reorder/bulk/hapus/tambah — itu tetap di sana).
// `kepala`: rak ikut menggambar judul "Modul" dan pemilih mata kuliah (antrean
// #298); tanpa itu (Modul.tsx masih punya h1 sendiri) hanya ringkasan dan tombol.
export function DosenModulRak({ kepala = false }: { kepala?: boolean }) {
  const queryClient = useQueryClient()
  const { courseId, course } = useCourse()
  const [jadwalOpen, setJadwalOpen] = useState(false)
  const [kelolaOpen, setKelolaOpen] = useState(false)
  const [pratinjau, setPratinjau] = useState<{ url: string; judul: string } | null>(null)
  const { data: modules = [] } = useModules()
  const moduleIds = useMemo(() => modules.map((m) => m.id), [modules])
  const { data: customs = {} } = useModulCustoms(moduleIds)
  const { data: pdfFiles = [] } = useQuery({
    queryKey: ['manajemen', 'modul-pdf-files'],
    queryFn: listModulPdfFiles,
    enabled: isSupabaseConfigured,
  })

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  // Watermark pembaca PDF per mata kuliah (antrean #157); isinya dipilih di modal (#177).
  const [capOpen, setCapOpen] = useState(false)

  const [editId, setEditId] = useState<number | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [formJudul, setFormJudul] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [formMenit, setFormMenit] = useState('')
  const [saving, setSaving] = useState(false)
  const [savingStatus, setSavingStatus] = useState('')
  const [createPdfFile, setCreatePdfFile] = useState<File | null>(null)

  function openEdit(id: number) {
    const m = modules.find((x) => x.id === id)
    const custom = customs[id]
    setCreatingNew(false)
    setEditId(id)
    setFormJudul(custom?.judul || m?.title || '')
    setFormDeskripsi(custom?.deskripsi || m?.description || '')
    setFormMenit(m?.estimasi_menit ? String(m.estimasi_menit) : '')
  }

  function openCreate() {
    setEditId(null)
    setCreatingNew(true)
    setFormJudul('')
    setFormDeskripsi('')
    setFormMenit('')
    setCreatePdfFile(null)
  }

  function closeFormModal() {
    setEditId(null)
    setCreatingNew(false)
    setCreatePdfFile(null)
  }

  // Tambah Modul + PDF (antrean #43): modul dibuat dulu (butuh id baru untuk
  // upload), lalu kalau dosen memilih berkas, PDF diunggah ke modul itu. PDF
  // gagal diunggah tidak membatalkan modul yang sudah tersimpan — dosen bisa
  // unggah ulang lewat "Ganti PDF" nanti.
  async function saveEdit() {
    const judul = formJudul.trim()
    if (!judul) return
    // Perkiraan waktu belajar (antrean #119 WP-3): kosong = tidak ditampilkan.
    const menit = formMenit.trim() === '' ? null : Number(formMenit)
    if (menit != null && !(Number.isInteger(menit) && menit >= 1 && menit <= 600)) {
      showToast('Perkiraan waktu belajar harus bilangan bulat 1 sampai 600 menit, atau dikosongkan.')
      return
    }
    if (creatingNew && !isSupabaseConfigured) {
      showToast('Tambah topik butuh koneksi Supabase, belum tersedia di mode demo.')
      return
    }
    setSaving(true)
    try {
      if (creatingNew) {
        // modules sudah tersaring per mata kuliah terpilih (useModules), jadi
        // nomor urut topik baru = jumlah topik mata kuliah ini + 1.
        const nextOrderNum = modules.length + 1
        const newId = await createModulReturningId({ judul, deskripsi: formDeskripsi.trim(), orderNum: nextOrderNum, courseId })
        if (menit != null) await saveModulCustom(newId, { judul, deskripsi: formDeskripsi.trim(), estimasiMenit: menit })
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
        if (createPdfFile) {
          setSavingStatus('Mengunggah PDF…')
          try {
            setPersenBaru(0)
            await uploadModulPdf(newId, createPdfFile, 1, setPersenBaru)
            await queryClient.invalidateQueries({ queryKey: ['modules'] })
            await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
            showToast('Topik baru ditambahkan')
          } catch (pdfErr) {
            const msg = pdfErr instanceof Error ? pdfErr.message : 'kesalahan tidak diketahui'
            showToast(`Topik tersimpan, PDF gagal diunggah: ${msg}`)
          }
        } else {
          showToast('Topik baru ditambahkan')
        }
      } else if (editId != null) {
        const data: ModulCustom = { ...customs[editId], judul, deskripsi: formDeskripsi.trim(), estimasiMenit: menit }
        await saveModulCustom(editId, data)
        await queryClient.invalidateQueries({ queryKey: ['manajemen', 'customs'] })
        await queryClient.invalidateQueries({ queryKey: ['modules'] })
        showToast('Topik disimpan')
      }
      closeFormModal()
    } catch (err) {
      // Pesan asli ditampilkan (antrean #316) supaya penyebabnya terbaca, bukan hanya "gagal".
      const pesan = err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : ''
      showToast(`${creatingNew ? 'Gagal menambahkan topik' : 'Gagal menyimpan topik'}${pesan ? `: ${pesan}` : ''}`)
    } finally {
      setSaving(false)
      setSavingStatus('')
    }
  }

  // Hapus modul (destruktif — progres, soal formatif via cascade, dan file
  // PDF di Storage ikut terhapus lewat deleteModul, lihat lib/manajemen.ts).
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await deleteModul(deleteId)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      showToast('Topik dihapus')
      setDeleteId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus topik')
    } finally {
      setDeleting(false)
    }
  }

  const [pdfModalId, setPdfModalId] = useState<number | null>(null)
  const [pdfFile, setPdfFile] = useState<File | null>(null)
  const [pdfError, setPdfError] = useState('')
  const [uploadingPdf, setUploadingPdf] = useState(false)
  const [pickedPdfUrl, setPickedPdfUrl] = useState('')
  const [assigningPdf, setAssigningPdf] = useState(false)
  const [persenUnggah, setPersenUnggah] = useState(0)
  const [halamanPdf, setHalamanPdf] = useState<number | null>(null)
  const [persenBaru, setPersenBaru] = useState(0)

  function openPdfModal(id: number) {
    setPdfModalId(id)
    setPdfFile(null)
    setPdfError('')
    setPickedPdfUrl('')
    setPersenUnggah(0)
  }

  async function handleUploadPdf() {
    if (pdfModalId == null || !pdfFile) return
    if (pdfFile.type !== 'application/pdf') {
      setPdfError('File harus berformat PDF.')
      return
    }
    setPdfError('')
    setUploadingPdf(true)
    setPersenUnggah(0)
    try {
      await uploadModulPdf(pdfModalId, pdfFile, 1, setPersenUnggah)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      await queryClient.invalidateQueries({ queryKey: ['manajemen', 'modul-pdf-files'] })
      setPdfFile(null)
      setPdfModalId(null)
      showToast('PDF topik berhasil diunggah')
    } catch {
      setPdfError('Gagal mengunggah PDF. Coba lagi.')
    } finally {
      setUploadingPdf(false)
    }
  }

  async function handleAssignPdf() {
    if (pdfModalId == null || !pickedPdfUrl) return
    setPdfError('')
    setAssigningPdf(true)
    try {
      await assignModulPdf(pdfModalId, pickedPdfUrl)
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
      setPickedPdfUrl('')
      showToast('PDF topik dipasang dari file yang sudah ada')
    } catch {
      setPdfError('Gagal memasang PDF. Coba lagi.')
    } finally {
      setAssigningPdf(false)
    }
  }

  const sorted = [...modules].sort((a, b) => a.order_num - b.order_num)
  const jumlahPdf = sorted.filter((m) => m.pdf_path).length

  // Urutan topik (antrean #104): seret kartu di rak atau lewat modal.
  const [urutkanOpen, setUrutkanOpen] = useState(false)
  async function simpanUrutan(ids: number[]) {
    try {
      await saveModulOrder(ids)
      showToast('Urutan topik disimpan')
    } catch {
      showToast('Gagal menyimpan urutan topik')
    } finally {
      await queryClient.invalidateQueries({ queryKey: ['modules'] })
    }
  }
  const { seretProps } = useSeretTopik(sorted, simpanUrutan)

  return (
    <>
      {/* Kepala rak satu baris (antrean #298/#299): judul + ringkasan, pemilih mata kuliah, menu Atur, Tambah Topik. */}
      <div className="flex items-center gap-x-3 gap-y-2 flex-wrap mb-4">
        <div className="min-w-0">
          {kepala && <h1 className="text-2xl font-bold text-brown leading-tight">Modul</h1>}
          <p className="text-xs text-brown-3">
            {sorted.length} topik · {sorted.length > 0 && jumlahPdf === sorted.length ? 'semua ber-PDF' : `${jumlahPdf} punya PDF`}
          </p>
        </div>
        {kepala && <MataKuliahSelect />}
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <MenuAksi tombol="Atur ▾" kelasTombol="btn btn-secondary btn-sm" rata="kanan">
            <ItemMenu onPilih={() => setCapOpen(true)} nonaktif={!course}>
              Watermark PDF: {LABEL_CAP[pilihanCap(course)]}
            </ItemMenu>
            <ItemMenu onPilih={() => setJadwalOpen(true)} nonaktif={!course || sorted.length === 0}>
              Jadwal pertemuan
            </ItemMenu>
            <ItemMenu onPilih={() => setUrutkanOpen(true)} nonaktif={sorted.length < 2}>
              Urutkan topik
            </ItemMenu>
            <div role="separator" className="my-1 h-px" style={BORDER_BG} />
            <ItemMenu onPilih={() => setKelolaOpen(true)}>Kelola mata kuliah</ItemMenu>
          </MenuAksi>
          <button onClick={openCreate} className="btn btn-primary btn-sm">
            + Tambah Topik
          </button>
        </div>
      </div>
      {kelolaOpen && <KelolaMataKuliahModal onClose={() => setKelolaOpen(false)} />}
      {pratinjau && <PratinjauLapis url={pratinjau.url} judul={pratinjau.judul} onTutup={() => setPratinjau(null)} />}
      <UrutkanTopikModal open={urutkanOpen} modules={sorted} onClose={() => setUrutkanOpen(false)} onSimpan={simpanUrutan} />
      {jadwalOpen && course && <JadwalModal course={course} modules={sorted} onClose={() => setJadwalOpen(false)} />}
      {capOpen && course && <WatermarkModal course={course} onClose={() => setCapOpen(false)} onSaved={showToast} />}
      {sorted.length === 0 ? (
        <p className="text-brown-3">Belum ada topik. Tambah topik pertama.</p>
      ) : (
        <Rak>
          {sorted.map((m, i) => {
            const custom = customs[m.id]
            const judul = custom?.judul || m.title
            const hasPdf = !!m.pdf_path
            return (
              <div key={m.id} {...seretProps(m.id)}>
              {/* Satu PDF per topik untuk kedua pertemuannya (antrean #289); video yang dua per topik. */}
              <KartuTopik
                nomor={m.order_num}
                pertemuan={labelPertemuan(i, m.minggu_mulai)}
                judul={judul}
                keterangan={hasPdf ? 'PDF' : 'Belum Ada PDF'}
                adaPdf={hasPdf}
                pdf={m.pdf_path}
                buatSampul
                kaki={m.estimasi_menit ? `± ${m.estimasi_menit} menit` : undefined}
                dosen={{
                  onPratinjau: () => m.pdf_path && setPratinjau({ url: m.pdf_path, judul }),
                  onUbah: () => openEdit(m.id),
                  onHapus: () => setDeleteId(m.id),
                  onGantiPdf: () => openPdfModal(m.id),
                }}
              />
              </div>
            )
          })}
        </Rak>
      )}

      {(editId != null || creatingNew) && (() => {
        const isian = (
          <>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-3">
              Judul
              <input
                value={formJudul}
                onChange={(e) => setFormJudul(e.target.value.slice(0, 100))}
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Deskripsi
              <textarea
                value={formDeskripsi}
                onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
                rows={3}
                className="rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
              Perkiraan Waktu Belajar (menit)
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                value={formMenit}
                onChange={(e) => setFormMenit(e.target.value)}
                placeholder="Kosongkan bila tidak perlu"
                className="h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown tabular-nums"
                style={BORDER}
              />
              <span className="font-normal text-brown-3">Tampil di kartu topik mahasiswa sebagai "± n menit".</span>
            </label>
          </>
        )
        const aksi = (
          <>
            <button type="button" onClick={closeFormModal} disabled={saving} className="btn btn-secondary">
              Batal
            </button>
            <button type="button" onClick={saveEdit} disabled={saving || !formJudul.trim()} className="btn btn-primary min-w-[7.5rem]">
              {saving ? (savingStatus ? 'Mengunggah…' : 'Menyimpan…') : creatingNew ? 'Tambah Topik' : 'Simpan'}
            </button>
          </>
        )
        // Ubah Topik: hanya isian, satu kolom. Tambah Topik: dua kolom dengan pratinjau PDF opsional (#304).
        if (!creatingNew) {
          return (
            <ModalBerkas judul="Ubah Topik" ikon={<IconEdit size={20} />} lebar={640} onTutup={closeFormModal} sibuk={saving} aksi={aksi}>
              {isian}
            </ModalBerkas>
          )
        }
        return (
          <ModalBerkas
            judul="Tambah Topik"
            subjudul={`Topik ${String(modules.length + 1).padStart(2, '0')} · ${course?.name ?? ''}`}
            ikon={<IconDocument size={20} />}
            onTutup={closeFormModal}
            sibuk={saving}
            kiri={createPdfFile ? <PratinjauBerkas file={createPdfFile} /> : <KosongPratinjau teks="PDF boleh menyusul. Bila dipilih sekarang, pratinjau halaman pertama tampil di sini." />}
            status={
              saving && savingStatus ? (
                <BilahUnggah persen={persenBaru} keterangan={createPdfFile ? `${createPdfFile.name} · jangan tutup jendela ini` : undefined} />
              ) : createPdfFile ? (
                <LencanaSiap>PDF siap diunggah</LencanaSiap>
              ) : null
            }
            aksi={aksi}
          >
            <LangkahBerkas nomor={1} judul="Data topik" aktif>
              <div>{isian}</div>
            </LangkahBerkas>
            <LangkahBerkas nomor={2} judul="PDF topik (opsional)" aktif={!!createPdfFile} akhir>
              <ZonaBerkas
                accept="application/pdf,.pdf"
                label="Pilih PDF"
                petunjuk="PDF, maks 20 MB."
                maxSizeMb={20}
                file={createPdfFile}
                disabled={saving}
                onChange={setCreatePdfFile}
              />
            </LangkahBerkas>
          </ModalBerkas>
        )
      })()}

      {deleteId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">
              Hapus Topik "{customs[deleteId]?.judul || modules.find((m) => m.id === deleteId)?.title || ''}"?
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Progres, soal formatif, dan PDF yang terpasang ikut terhapus.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="btn btn-secondary btn-sm flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger btn-sm flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pdfModalId != null && (() => {
        const urut = [...modules].sort((a, b) => a.order_num - b.order_num)
        const idx = urut.findIndex((x) => x.id === pdfModalId)
        const m = urut[idx]
        const kini = m?.pdf_path
        const nama = kini ? kini.split('/').pop()?.split('?')[0] : null
        const judulTopik = customs[pdfModalId]?.judul || m?.title || ''
        return (
          <ModalBerkas
            judul={kini ? 'Ganti PDF Topik' : 'Unggah PDF Topik'}
            subjudul={m ? `Topik ${String(idx + 1).padStart(2, '0')} · ${judulTopik} · ${labelPertemuan(idx, m.minggu_mulai)}` : undefined}
            onTutup={() => setPdfModalId(null)}
            sibuk={uploadingPdf}
            kiri={pdfFile ? <PratinjauBerkas file={pdfFile} onHalaman={setHalamanPdf} /> : <KosongPratinjau teks="Pilih atau seret PDF untuk melihat pratinjau halaman pertama." />}
            status={
              uploadingPdf ? (
                <BilahUnggah persen={persenUnggah} keterangan={pdfFile ? `${pdfFile.name} · jangan tutup jendela ini` : undefined} />
              ) : pdfError ? (
                <p className="text-[13px] text-danger" role="alert">{pdfError}</p>
              ) : pdfFile ? (
                <LencanaSiap>Siap diunggah</LencanaSiap>
              ) : null
            }
            aksi={
              <>
                <button type="button" onClick={() => setPdfModalId(null)} disabled={uploadingPdf} className="btn btn-secondary">
                  Batal
                </button>
                <button type="button" onClick={handleUploadPdf} disabled={!pdfFile || uploadingPdf} className="btn btn-primary min-w-[9rem]">
                  <IconUpload size={16} /> {uploadingPdf ? 'Mengunggah…' : 'Unggah PDF'}
                </button>
              </>
            }
          >
            <LangkahBerkas nomor={1} judul="Berkas sekarang">
              <div className="flex items-center gap-3 px-3.5 py-3 rounded-[10px] border bg-bg3 min-w-0" style={BORDER}>
                <IconDocument size={18} className="text-brown-3 flex-shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-brown-2 truncate" title={nama ?? undefined}>{nama ?? 'Belum ada berkas'}</span>
                {nama && <span className="text-xs text-brown-3 flex-shrink-0">{pdfFile ? 'akan diganti' : 'terpasang'}</span>}
              </div>
            </LangkahBerkas>
            <LangkahBerkas nomor={2} judul="Pilih berkas baru" aktif>
              <ZonaBerkas
                accept="application/pdf,.pdf"
                label="Pilih PDF"
                petunjuk="PDF, maks 20 MB."
                maxSizeMb={20}
                file={pdfFile}
                meta={halamanPdf != null ? `${halamanPdf} halaman` : undefined}
                disabled={uploadingPdf}
                onChange={(f) => {
                  setPdfFile(f)
                  setHalamanPdf(null)
                  setPdfError('')
                }}
              />
              {isSupabaseConfigured && pdfFiles.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mt-2" aria-hidden="true">
                    <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-brown-3">Atau pakai berkas yang sudah ada</span>
                    <span className="flex-1 h-px" style={{ background: 'var(--border)' }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-2.5 items-start">
                    <div className="flex items-center gap-2 min-w-0">
                      <Select
                        value={pickedPdfUrl}
                        onChange={setPickedPdfUrl}
                        placeholder="Pilih dari berkas yang sudah diunggah"
                        className="h-11 px-2.5 rounded-lg border text-sm text-brown flex-1 min-w-0"
                        style={BORDER}
                        options={pdfFiles.map((f) => ({
                          value: f.url,
                          label: f.usedBy ? `${f.name}, dipakai: ${f.usedBy}` : `${f.name}: belum dipakai`,
                        }))}
                      />
                      {pickedPdfUrl && <PdfPreviewLink url={pickedPdfUrl} label="Pratinjau Berkas yang Dipilih" />}
                    </div>
                    <button
                      type="button"
                      onClick={handleAssignPdf}
                      disabled={!pickedPdfUrl || assigningPdf || uploadingPdf}
                      className="btn btn-secondary min-w-[7rem]"
                    >
                      {assigningPdf ? 'Memasang…' : 'Gunakan'}
                    </button>
                  </div>
                </>
              )}
            </LangkahBerkas>
            <LangkahBerkas nomor={3} judul="Unggah" akhir>
              <p className="text-[13px] text-brown-3 leading-relaxed">
                Berkas baru menggantikan berkas sekarang. Mahasiswa langsung membaca versi baru, dan berkas lama dihapus bila tidak dipakai topik lain.
              </p>
            </LangkahBerkas>
          </ModalBerkas>
        )
      })()}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-brown text-white text-sm px-4 py-2.5 rounded-lg z-[700]">
          {toast}
        </div>
      )}
    </>
  )
}

// Modal jadwal untuk mata kuliah yang belum tentu sedang dipilih: topiknya diambil sendiri (antrean #159).
function JadwalMataKuliah({ course, onClose }: { course: Course; onClose: () => void }) {
  const { data: modules } = useQuery({ queryKey: ['modules', 'course', course.id], queryFn: () => fetchModules(course.id) })
  if (!modules) return null
  return <JadwalModal course={course} modules={modules} onClose={onClose} />
}

// Modal "Kelola mata kuliah" (antrean #68) — dosen daftar, ubah, hapus, dan
// menambah mata kuliah. Dibuka dari tombol di samping MataKuliahSelect di
// ModulList().
function KelolaMataKuliahModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { courses } = useCourse()

  const [toast, setToast] = useState<string | null>(null)
  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  const [editId, setEditId] = useState<number | null>(null)
  const [formKode, setFormKode] = useState('')
  const [formNama, setFormNama] = useState('')
  const [formDeskripsi, setFormDeskripsi] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setEditId(null)
    setFormKode('')
    setFormNama('')
    setFormDeskripsi('')
  }

  function openEdit(c: Course) {
    setEditId(c.id)
    setFormKode(c.code)
    setFormNama(c.name)
    setFormDeskripsi(c.description)
  }

  async function saveForm() {
    const kode = formKode.trim()
    const nama = formNama.trim()
    if (!kode || !nama) return
    setSaving(true)
    try {
      if (editId != null) {
        await updateCourse(editId, { code: kode, name: nama, description: formDeskripsi.trim() })
        showToast('Mata kuliah disimpan')
      } else {
        await createCourse({ code: kode, name: nama, description: formDeskripsi.trim(), dosenId: user?.id ?? null })
        showToast('Mata kuliah ditambahkan')
      }
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      resetForm()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menyimpan mata kuliah')
    } finally {
      setSaving(false)
    }
  }

  // Buka atau tutup mata kuliah untuk mahasiswa (antrean #141). Yang terakhir
  // masih dibuka tidak bisa ditutup, supaya mahasiswa selalu punya satu.
  const jumlahDibuka = courses.filter((c) => c.is_active).length
  const [togglingId, setTogglingId] = useState<number | null>(null)
  async function toggleBuka(c: Course) {
    setTogglingId(c.id)
    try {
      await updateCourse(c.id, { is_active: !c.is_active })
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      showToast(c.is_active ? `${c.name} ditutup untuk mahasiswa` : `${c.name} dibuka untuk mahasiswa`)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal mengubah akses mata kuliah')
    } finally {
      setTogglingId(null)
    }
  }

  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)
  // Jadwal mata kuliah mana pun bisa diatur dari modal ini (antrean #159).
  const [jadwalCourse, setJadwalCourse] = useState<Course | null>(null)

  async function confirmDelete() {
    if (deleteId == null) return
    setDeleting(true)
    try {
      await deleteCourse(deleteId)
      await queryClient.invalidateQueries({ queryKey: ['courses'] })
      showToast('Mata kuliah dihapus')
      setDeleteId(null)
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Gagal menghapus mata kuliah')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
        style={{ background: 'rgba(44,36,32,.55)', animation: 'fadeInBg 0.18s ease' }}
      >
        <div
          className="bg-ivory rounded-2xl modal-lebar p-5 sm:p-6 my-6"
          style={{ boxShadow: '0 16px 48px rgba(44,36,32,.25)', animation: 'slideUpModal 0.22s ease' }}
        >
          <h3 className="font-display text-lg font-semibold text-brown mb-4">Kelola Mata Kuliah</h3>

          <div className="flex flex-col gap-2 mb-4">
            {courses.length === 0 ? (
              <p className="text-sm text-brown-3">Belum ada mata kuliah.</p>
            ) : (
              courses.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 flex-wrap row-divider py-2">
                  <div className="min-w-0 flex-1 basis-56">
                    <div className="text-sm font-semibold text-brown break-words">
                      {c.code} · {c.name}
                    </div>
                    <div className="text-[11px] text-brown-3">
                      {c.is_active ? 'Dibuka untuk mahasiswa' : 'Ditutup, mahasiswa tidak melihatnya'}
                    </div>
                    <div className="text-[11px] text-brown-3">
                      {c.mulai_kuliah ? `Mulai kuliah: ${formatTanggal(tanggalLokal(c.mulai_kuliah))}` : 'Tanggal mulai kuliah belum diatur'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      role="switch"
                      aria-checked={c.is_active}
                      aria-label={`Mata kuliah ${c.name} dibuka untuk mahasiswa`}
                      title={c.is_active && jumlahDibuka <= 1 ? 'Minimal satu mata kuliah harus tetap dibuka' : undefined}
                      onClick={() => void toggleBuka(c)}
                      disabled={togglingId != null || (c.is_active && jumlahDibuka <= 1)}
                      className="btn btn-secondary min-w-[6.5rem]"
                    >
                      {c.is_active ? 'Tutup Akses' : 'Buka Akses'}
                    </button>
                    <button onClick={() => setJadwalCourse(c)} className="btn btn-secondary min-w-[4.5rem]">
                      Jadwal
                    </button>
                    <button onClick={() => openEdit(c)} className="btn btn-secondary min-w-[4.5rem]">
                      Ubah
                    </button>
                    <button
                      onClick={() => setDeleteId(c.id)}
                      disabled={c.is_active && jumlahDibuka <= 1}
                      aria-label={`Hapus mata kuliah ${c.name}`}
                      title={c.is_active && jumlahDibuka <= 1 ? 'Minimal satu mata kuliah harus tetap dibuka' : 'Hapus mata kuliah'}
                      className="btn btn-danger btn-icon flex-shrink-0"
                    >
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-4 border-t" style={BORDER}>
            <p className="text-[11px] font-semibold text-brown-3 uppercase tracking-wide mb-2">
              {editId != null ? 'Ubah Mata Kuliah' : 'Tambah Mata Kuliah'}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-[140px_minmax(0,1fr)] gap-2 mb-2">
              <input
                value={formKode}
                onChange={(e) => setFormKode(e.target.value.slice(0, 20))}
                placeholder="Kode, mis. MPP"
                className="w-full min-w-0 h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
              <input
                value={formNama}
                onChange={(e) => setFormNama(e.target.value.slice(0, 100))}
                placeholder="Nama mata kuliah"
                className="w-full min-w-0 h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown"
                style={BORDER}
              />
            </div>
            <textarea
              value={formDeskripsi}
              onChange={(e) => setFormDeskripsi(e.target.value.slice(0, 200))}
              placeholder="Deskripsi (opsional)"
              rows={3}
              className="w-full rounded-[var(--radius-control)] border px-3 py-2 text-base text-brown resize-y mb-3"
              style={BORDER}
            />
            <div className="flex gap-2.5 justify-end">
              {editId != null && (
                <button onClick={resetForm} className="btn btn-secondary">
                  Batal Ubah
                </button>
              )}
              <button
                onClick={() => void saveForm()}
                disabled={saving || !formKode.trim() || !formNama.trim()}
                className="btn btn-primary min-w-[7.5rem]"
              >
                {saving ? 'Menyimpan…' : editId != null ? 'Simpan' : 'Tambah'}
              </button>
            </div>
          </div>

          <div className="flex justify-end pt-4 mt-2 border-t" style={BORDER}>
            <button onClick={onClose} className="btn btn-secondary">
              Tutup
            </button>
          </div>
        </div>
      </div>

      {jadwalCourse && <JadwalMataKuliah course={jadwalCourse} onClose={() => setJadwalCourse(null)} />}

      {deleteId != null && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl modal-sempit p-6 text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">
              Hapus Mata Kuliah "{courses.find((c) => c.id === deleteId)?.name || ''}"?
            </h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Semua topik, soal, dan hasil tes mata kuliah ini ikut terhapus.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setDeleteId(null)} disabled={deleting} className="btn btn-secondary btn-sm flex-1">
                Batal
              </button>
              <button onClick={() => void confirmDelete()} disabled={deleting} className="btn btn-danger btn-sm flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-brown text-white text-sm px-4 py-2.5 rounded-lg z-[800]">
          {toast}
        </div>
      )}
    </>
  )
}

// /modul (spec §8.0, §9 WP5, rak sampul antrean #85 opsi B). Mahasiswa: rak
// semua topik, kartu terkunci pudar (§4.2 lib/topik). Dosen: rak kelola PDF
// (§5.2), sama seperti di /modul/:id (lihat Modul.tsx).
export function ModulList() {
  const { role } = useAuth()
  const { data: modules = [] } = useModules()
  const { data: progress = {} } = useAllProgress()
  const { statusOf, bukaPada } = useTopikStatus()
  const ambangFormatif = useAmbang().formatif

  const sorted = useMemo(() => [...modules].sort((a, b) => a.order_num - b.order_num), [modules])
  const lanjut = useMemo(
    () => sorted.find((m) => statusOf(m.id) !== 'locked' && (progress[moduleIdToPath(m.id)]?.pct ?? 0) < 100) ?? sorted[0],
    [sorted, statusOf, progress],
  )

  return (
    <Layout>
      <div className="p-4 md:p-6">
        {role === 'dosen' ? (
          <DosenModulRak kepala />
        ) : (
          <>
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <h1 className="text-2xl font-bold text-brown">Modul</h1>
              <MataKuliahSelect />
            </div>
            <p className="text-sm text-brown-3 mb-4">{sorted.length} topik · dibaca sebagai flipbook</p>
            {lanjut && statusOf(lanjut.id) !== 'locked' && (
              <Link to={`/modul/${lanjut.id}`} className="btn btn-primary btn-sm inline-block mb-4">
                Lanjutkan Membaca
              </Link>
            )}
            {sorted.length === 0 ? (
              <p className="text-brown-3">Belum ada topik di mata kuliah ini.</p>
            ) : (
              <Rak>
                {sorted.map((m, i) => {
                  const status = statusOf(m.id)
                  const entry = progress[moduleIdToPath(m.id)]
                  const pct = entry?.pct ?? 0
                  const total = entry?.totalPages ?? null
                  const kaki =
                    pct >= 100
                      ? total ? `${total}/${total} hal` : 'Selesai dibaca'
                      : pct > 0 && entry?.currentPage > 0
                        ? total ? `${halamanTerjauh(pct, total)}/${total} hal` : `Halaman ${entry.currentPage}`
                        : total ? `0/${total} hal` : 'Belum dibaca'
                  const chip =
                    status === 'done' ? (
                      <ChipRak jenis="ok" label="Selesai" />
                    ) : status === 'locked' ? (
                      <ChipRak jenis="todo" label="Terkunci" />
                    ) : pct >= 100 ? (
                      // Antrean #161: halaman habis dibaca = "Sudah dibaca"; "Selesai" tetap berarti tes formatif lulus.
                      <ChipRak jenis="ok" label="Sudah Dibaca" />
                    ) : (
                      <ChipRak jenis="now" label={pct > 0 ? 'Sedang Dibaca' : 'Siap Dibaca'} />
                    )
                  const label = labelPertemuan(i, m.minggu_mulai)
                  const terkunci = status === 'locked'
                  const judulKunci = bukaPada(m.id) ? `Dibuka ${formatTanggal(bukaPada(m.id)!)}` : `Selesaikan tes formatif topik sebelumnya (skor ${ambangFormatif}) dulu`
                  return (
                  <KartuTopik
                    key={m.id}
                    nomor={m.order_num}
                    pertemuan={label}
                    judul={m.title}
                    keterangan={m.pdf_path ? (total ? `${total} hal` : 'PDF') : 'Belum Ada PDF'}
                    adaPdf={!!m.pdf_path}
                    pdf={m.pdf_path}
                    persen={pct}
                    kaki={m.estimasi_menit ? `${kaki} · ± ${m.estimasi_menit} menit` : kaki}
                    chip={chip}
                    terkunci={terkunci}
                    judulKunci={judulKunci}
                    to={`/modul/${m.id}`}
                  />
                  )
                })}
              </Rak>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}

export default ModulList
