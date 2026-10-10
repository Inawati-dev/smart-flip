import { useState, type ReactNode } from 'react'
import { useQueries } from '@tanstack/react-query'
import { useCourse } from '../contexts/CourseContext'
import { useModules } from '../hooks/useModules'
import { labelKelas, tahunUnik, type Kelas, type KelasWithCount } from '../lib/kelas'
import { fetchSubmissionsDosen, deleteProject, type FinalProject } from '../lib/tugasAkhir'
import {
  BOBOT_BAWAAN,
  PAKET_PROPOSAL,
  babPaket,
  bobotSah,
  briefPaket,
  buatPaketProposal,
  simpanBobotPaket,
  tenggatBawaan,
} from '../lib/paketProposal'
import { IconEdit, IconTrash } from './icons'
import { TanggalInput } from './TanggalInput'

// Paket Rancangan Proposal, sisi dosen (antrean #179): kartu pembuat paket,
// tabel empat Mini Projek, ubah bobot, dan hapus paket. Rancangan layar:
// canvas "Dosen: Paket Proposal di Bank Soal".
const BORDER = { borderColor: 'var(--border)' } as const
const MODAL_SHADOW = { boxShadow: '0 16px 48px color-mix(in srgb, var(--shadow-color) 25%, transparent)' }

/** 'Bab 1 · Pendahuluan' menjadi 'Bab 1'; 'Rancangan Proposal Lengkap' tetap. */
const labelBab = (judul: string) => judul.split(' · ')[0]

// Tenggat tersimpan sebagai ISO berzona (UTC). Isian tanggal memakai jam
// setempat 'YYYY-MM-DDTHH:mm', jadi harus dikonversi, bukan dipotong: memotong
// teks ISO menampilkan jam UTC sebagai jam setempat, lalu saat disimpan lagi
// tenggat bergeser sebesar selisih zona (7 jam di WIB) tiap kali (antrean #171).
export function isoKeLokal(iso: string): string {
  const t = new Date(iso)
  if (Number.isNaN(t.getTime())) return ''
  const p = (n: number) => String(n).padStart(2, '0')
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}`
}

function formatTenggat(deadline: string | null): string {
  if (!deadline) return 'Tanpa tenggat'
  return new Date(deadline).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

function teksTopik(topik: number[]): string {
  return topik.length > 3 ? `Topik ${topik[0]} sampai ${topik[topik.length - 1]}` : `Topik ${topik.join(', ')}`
}

function teksBagian(urutan: number): string {
  const b = babPaket(urutan)
  if (!b) return '-'
  if (urutan === 4) return `${b.bagian.length - 1} bab + Daftar Pustaka`
  return `${b.bagian.length}${b.butuhTautan ? ' + tautan prototipe' : ''}`
}

/** Pemilih kelas yang sama dengan modal brief: "Semua Kelas" atau centang per kelas. */
export function PemilihKelas({
  kelasList,
  semuaKelas,
  setSemuaKelas,
  classIds,
  toggleKelas,
}: {
  kelasList: Kelas[]
  semuaKelas: boolean
  setSemuaKelas: (v: boolean) => void
  classIds: string[]
  toggleKelas: (id: string) => void
}) {
  return (
    <div className="mb-3">
      <span className="text-[13px] font-semibold text-brown-2 block mb-1.5">Kelas</span>
      <label className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
        <input type="checkbox" checked={semuaKelas} onChange={(e) => setSemuaKelas(e.target.checked)} className="w-4 h-4 accent-terra" />
        Semua Kelas
      </label>
      {!semuaKelas && (
        <div className="flex flex-col gap-2 max-h-40 overflow-y-auto border rounded-lg p-2" style={BORDER}>
          {tahunUnik(kelasList).map((tahun) => (
            <div key={tahun}>
              <div className="text-[13px] font-semibold text-brown-3 uppercase tracking-wide mb-1">{tahun}</div>
              <div className="flex flex-col gap-1.5">
                {kelasList
                  .filter((k) => k.angkatan === tahun)
                  .map((k) => (
                    <label key={k.id} className="flex items-center gap-2 text-sm text-brown-2 min-h-11">
                      <input
                        type="checkbox"
                        checked={classIds.includes(k.id)}
                        onChange={() => toggleKelas(k.id)}
                        className="w-4 h-4 accent-terra"
                      />
                      {labelKelas(k, kelasList)}
                    </label>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function Modal({ lebar, children }: { lebar: number; children: ReactNode }) {
  return (
    <div
      className="fixed inset-0 z-[600] flex items-start justify-center p-4 overflow-y-auto"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div
        className="bg-ivory rounded-2xl p-6 max-w-[90vw] max-h-[90vh] overflow-y-auto my-8"
        style={{ ...MODAL_SHADOW, width: lebar, animation: 'slideUpModal 0.22s ease' }}
      >
        {children}
      </div>
    </div>
  )
}

function ModalBuat({
  kelasList,
  courseId,
  userId,
  awal,
  onClose,
  onSelesai,
}: {
  kelasList: KelasWithCount[]
  courseId: number
  userId: string
  awal: string[]
  onClose: () => void
  onSelesai: () => Promise<void>
}) {
  const [tenggat, setTenggat] = useState<string[]>(awal)
  const [semuaKelas, setSemuaKelas] = useState(true)
  const [classIds, setClassIds] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')

  async function simpan() {
    if (tenggat.some((t) => t && Number.isNaN(new Date(t).getTime()))) {
      setGalat('Tanggal tenggat tidak sah.')
      return
    }
    setSaving(true)
    setGalat('')
    try {
      await buatPaketProposal({
        dosenId: userId,
        classIds: semuaKelas ? [] : classIds,
        courseId,
        tenggat: tenggat.map((t) => (t ? new Date(t).toISOString() : null)),
      })
      await onSelesai()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : (e as { message?: string } | null)?.message || 'Gagal membuat paket proposal')
      setSaving(false)
    }
  }

  return (
    <Modal lebar={560}>
      <h3 className="font-display text-lg font-semibold text-brown mb-1">Buat Paket Proposal</h3>
      <p className="text-sm text-brown-3 mb-4 leading-relaxed">
        Empat Mini Projek dibuat sekaligus dengan rubrik dan bobot usulan. Tenggat boleh dikosongkan dan diubah nanti per bab.
      </p>
      <PemilihKelas
        kelasList={kelasList}
        semuaKelas={semuaKelas}
        setSemuaKelas={setSemuaKelas}
        classIds={classIds}
        toggleKelas={(id) => setClassIds((p) => (p.includes(id) ? p.filter((k) => k !== id) : [...p, id]))}
      />
      <div className="flex flex-col gap-3 mb-4">
        {PAKET_PROPOSAL.map((b, i) => (
          <label key={b.urutan} className="flex flex-col gap-1 text-[13px] font-semibold text-brown-2">
            Tenggat {labelBab(b.judul)}
            <TanggalInput
              denganJam
              ariaLabel={`Tenggat ${labelBab(b.judul)}`}
              value={tenggat[i]}
              onChange={(v) => setTenggat((p) => p.map((t, idx) => (idx === i ? v : t)))}
            />
          </label>
        ))}
      </div>
      {galat && (
        <p role="alert" className="text-sm text-danger mb-3">
          {galat}
        </p>
      )}
      <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
        <button onClick={onClose} disabled={saving} className="btn btn-secondary">
          Batal
        </button>
        <button onClick={() => void simpan()} disabled={saving} className="btn btn-primary min-w-[7.5rem]">
          {saving ? 'Membuat…' : 'Buat Paket'}
        </button>
      </div>
    </Modal>
  )
}

function ModalBobot({
  briefs,
  onClose,
  onSelesai,
}: {
  briefs: FinalProject[]
  onClose: () => void
  onSelesai: () => Promise<void>
}) {
  const [nilai, setNilai] = useState<string[]>(briefs.map((b, i) => String(b.bobot ?? BOBOT_BAWAAN[i])))
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')
  const angka = nilai.map((v) => (v.trim() === '' ? NaN : Number(v)))
  const jumlah = angka.reduce((a, b) => a + (Number.isNaN(b) ? 0 : b), 0)
  const sah = bobotSah(angka)

  async function simpan() {
    setSaving(true)
    setGalat('')
    try {
      await simpanBobotPaket(briefs, angka)
      await onSelesai()
    } catch (e) {
      setGalat(e instanceof Error ? e.message : (e as { message?: string } | null)?.message || 'Gagal menyimpan bobot')
      setSaving(false)
    }
  }

  return (
    <Modal lebar={440}>
      <h3 className="font-display text-lg font-semibold text-brown mb-1">Ubah Bobot Nilai</h3>
      <p className="text-sm text-brown-3 mb-4">Sumbangan tiap Mini Projek ke nilai Mini Projek di rekap, dalam persen.</p>
      <div className="flex flex-col gap-3 mb-3">
        {briefs.map((b, i) => (
          <label key={b.id} className="flex items-center justify-between gap-3 text-sm font-medium text-brown">
            {b.title}
            <input
              type="number"
              inputMode="numeric"
              min={0}
              max={100}
              value={nilai[i]}
              onChange={(e) => setNilai((p) => p.map((v, idx) => (idx === i ? e.target.value : v)))}
              aria-label={`Bobot ${b.title}`}
              className="h-11 w-24 flex-shrink-0 rounded-[var(--radius-control)] border px-3 text-base text-brown text-center tabular-nums"
              style={BORDER}
            />
          </label>
        ))}
      </div>
      <p className={`text-sm tabular-nums mb-3 ${sah ? 'text-brown-3' : 'text-danger'}`}>
        {sah ? 'Jumlah 100, bobot sah.' : `Jumlah sekarang ${jumlah}. Jumlah keempat bobot harus tepat 100, tiap bobot bilangan bulat.`}
      </p>
      {galat && (
        <p role="alert" className="text-sm text-danger mb-3">
          {galat}
        </p>
      )}
      <div className="flex gap-2.5 justify-end pt-3 border-t" style={BORDER}>
        <button onClick={onClose} disabled={saving} className="btn btn-secondary">
          Batal
        </button>
        <button onClick={() => void simpan()} disabled={!sah || saving} className="btn btn-primary min-w-[7.5rem]">
          {saving ? 'Menyimpan…' : 'Simpan Bobot'}
        </button>
      </div>
    </Modal>
  )
}

export function PaketProposalDosen({
  projects,
  kelasList,
  courseId,
  userId,
  onTambahLain,
  onLihat,
  onUbah,
  onChanged,
  onToast,
  onDihapus,
}: {
  projects: FinalProject[]
  kelasList: KelasWithCount[]
  courseId: number
  userId: string
  onTambahLain: () => void
  onLihat: (id: string) => void
  onUbah: (p: FinalProject) => void
  onChanged: () => Promise<void>
  onToast: (msg: string) => void
  onDihapus: (ids: string[]) => void
}) {
  const { course } = useCourse()
  const { data: modules = [] } = useModules()
  const briefs = briefPaket(projects)
  const ada = briefs.length > 0

  const [buka, setBuka] = useState<'buat' | 'bobot' | 'hapus' | null>(null)
  const [deleting, setDeleting] = useState(false)

  const kiriman = useQueries({
    queries: briefs.map((b) => ({ queryKey: ['final-submissions', b.id], queryFn: () => fetchSubmissionsDosen(b.id) })),
  })

  const bobotTampil = briefs.map((b, i) => b.bobot ?? BOBOT_BAWAAN[i])
  const tenggatAwal = () => {
    const urut = [...modules].sort((a, b) => a.order_num - b.order_num)
    return tenggatBawaan(course?.mulai_kuliah, urut).map((t) => (t ? isoKeLokal(t) : ''))
  }

  function jumlahMahasiswa(b: FinalProject): number {
    const sasaran = b.class_ids.length === 0 ? kelasList : kelasList.filter((k) => b.class_ids.includes(k.id))
    return sasaran.reduce((a, k) => a + (k.studentCount ?? 0), 0)
  }

  async function selesai(pesan: string) {
    await onChanged()
    onToast(pesan)
    setBuka(null)
  }

  async function hapusPaket() {
    setDeleting(true)
    try {
      for (const b of briefs) await deleteProject(b.id)
      await onChanged()
      onDihapus(briefs.map((b) => b.id))
      onToast('Paket proposal dihapus')
      setBuka(null)
    } catch {
      await onChanged()
      onToast('Gagal menghapus paket; sebagian brief mungkin sudah terhapus')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <section
        className="bg-ivory rounded-2xl border p-4 sm:p-5 mb-4 flex flex-wrap items-center justify-between gap-3"
        style={BORDER}
      >
        <div className="flex-1 basis-[20rem] min-w-0">
          <h2 className="font-display text-lg font-semibold text-brown">Paket Rancangan Proposal</h2>
          <p className="text-sm text-brown-2 mt-1 leading-relaxed">
            Tiga Mini Projek per bab dan satu Rancangan Proposal Lengkap berisi Daftar Pustaka, dibuat sekali klik: bagian wajib, rubrik,
            bobot, dan topik sumbernya sudah terisi. Tenggat mengikuti jadwal kuliah dan bisa diubah per bab.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={onTambahLain} className="btn btn-secondary">
            + Mini Projek Lain
          </button>
          {!ada && (
            <button onClick={() => setBuka('buat')} className="btn btn-primary">
              Buat Paket Proposal
            </button>
          )}
        </div>
      </section>

      {ada && (
        <section className="bg-ivory rounded-2xl border overflow-hidden mb-6" style={BORDER}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse text-sm">
              <thead>
                <tr className="bg-bg3">
                  {['Mini Projek', 'Topik Sumber', 'Bagian', 'Bobot Nilai', 'Tenggat', 'Terkirim', 'Dinilai', 'Aksi'].map((h) => (
                    <th key={h} scope="col" className="text-left px-3 py-2.5 text-[13px] font-semibold text-brown-3 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {briefs.map((b, i) => {
                  const bab = babPaket(b.urutan)
                  const data = kiriman[i]?.data ?? []
                  const total = jumlahMahasiswa(b)
                  const nilai = data.filter((s) => s.graded_at != null).length
                  return (
                    <tr key={b.id} className="row-divider">
                      <td className="px-3 py-2.5 font-semibold text-brown">{b.title}</td>
                      <td className="px-3 py-2.5 text-brown-2">{bab ? teksTopik(bab.topik) : '-'}</td>
                      <td className="px-3 py-2.5 text-brown-2">{teksBagian(b.urutan ?? 0)}</td>
                      <td className="px-3 py-2.5 font-semibold text-brown tabular-nums">{bobotTampil[i]}%</td>
                      <td className="px-3 py-2.5 text-brown-2">{formatTenggat(b.deadline)}</td>
                      <td className="px-3 py-2.5 tabular-nums">{total > 0 ? `${data.length} dari ${total}` : data.length}</td>
                      <td className="px-3 py-2.5 tabular-nums">{nilai}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 whitespace-nowrap">
                          <button onClick={() => onLihat(b.id)} className="btn btn-secondary">
                            Lihat Kiriman
                          </button>
                          <button onClick={() => onUbah(b)} aria-label={`Ubah ${b.title}`} title="Ubah tenggat dan rubrik" className="btn btn-secondary">
                            <IconEdit size={13} /> Ubah
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-t" style={BORDER}>
            <p className="text-sm text-brown-2 flex-1 basis-[20rem] min-w-0">
              Nilai Mini Projek di rekap ={' '}
              {briefs.map((b, i) => `${bobotTampil[i]}% ${labelBab(b.title)}`).join(' + ')}.
            </p>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setBuka('bobot')} className="btn btn-secondary">
                Ubah Bobot
              </button>
              <button onClick={() => setBuka('hapus')} className="btn btn-danger">
                <IconTrash size={14} /> Hapus Paket
              </button>
            </div>
          </div>
        </section>
      )}

      {buka === 'buat' && (
        <ModalBuat
          kelasList={kelasList}
          courseId={courseId}
          userId={userId}
          awal={tenggatAwal()}
          onClose={() => setBuka(null)}
          onSelesai={() => selesai('Paket proposal dibuat')}
        />
      )}
      {buka === 'bobot' && <ModalBobot briefs={briefs} onClose={() => setBuka(null)} onSelesai={() => selesai('Bobot disimpan')} />}
      {buka === 'hapus' && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-[90vw] w-96 max-h-[90vh] overflow-y-auto text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus Paket Proposal?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              Keempat Mini Projek dihapus bersama, dan semua kiriman serta nilai mahasiswa di dalamnya ikut terhapus.
            </p>
            <div className="flex gap-2.5">
              <button onClick={() => setBuka(null)} disabled={deleting} className="btn btn-secondary btn-sm flex-1">
                Batal
              </button>
              <button onClick={() => void hapusPaket()} disabled={deleting} className="btn btn-danger btn-sm flex-1 min-w-[7.5rem]">
                {deleting ? 'Menghapus…' : 'Ya, Hapus Paket'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
