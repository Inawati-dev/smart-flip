import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { useKelasByDosen } from '../hooks/useKelas'
import { createKelas, deleteKelas, summarizeKelas, type KelasWithCount } from '../lib/kelas'
import { Layout } from '../components/Layout'
import { IconTrash, IconLink } from '../components/icons'

const BORDER = { borderColor: 'var(--border)' } as const
const CURRENT_YEAR = new Date().getFullYear()

// Dosen-only "Kelola Kelas" page — Tahap 1 of the kelas/rombongan-belajar
// feature (see database/migration_v7_kelas.sql for the full context). Dosen
// create a kelas (name + angkatan + capacity, code auto-generated), share
// the code with mahasiswa, and mahasiswa self-register with it
// (Register.tsx's optional "Kode Kelas" field). This page only reads/writes
// through src/lib/kelas.ts — same DataLayer-abstraction convention as every
// other dosen-only management page (see Manajemen.tsx).
export function Kelas() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { data: classes = [], isLoading } = useKelasByDosen(user?.id)
  const summary = summarizeKelas(classes)

  const [name, setName] = useState('')
  const [angkatan, setAngkatan] = useState(CURRENT_YEAR)
  const [maxStudents, setMaxStudents] = useState(40)
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<KelasWithCount | null>(null)
  const [deleting, setDeleting] = useState(false)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2800)
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setFormError('')
    setCreating(true)
    try {
      const kelas = await createKelas({ name, angkatan, maxStudents, dosenId: user.id })
      await queryClient.invalidateQueries({ queryKey: ['kelas', 'byDosen', user.id] })
      setName('')
      setAngkatan(CURRENT_YEAR)
      setMaxStudents(40)
      showToast(`Kelas "${kelas.name}" dibuat — kode: ${kelas.code}`)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal membuat kelas.')
    } finally {
      setCreating(false)
    }
  }

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code)
      showToast(`Kode "${code}" disalin`)
    } catch {
      showToast('Gagal menyalin — salin manual dari layar.')
    }
  }

  async function confirmDelete() {
    if (!deleteTarget || !user) return
    setDeleting(true)
    try {
      await deleteKelas(deleteTarget.id)
      await queryClient.invalidateQueries({ queryKey: ['kelas', 'byDosen', user.id] })
      showToast(`Kelas "${deleteTarget.name}" dihapus`)
      setDeleteTarget(null)
    } catch {
      showToast('Gagal menghapus kelas. Coba lagi.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Layout>
      <div className="p-4 md:p-6 pb-16">
        <div className="mb-5">
          <h1 className="font-['Playfair_Display',serif] text-2xl font-bold text-brown">Kelola Kelas</h1>
          <p className="text-sm text-brown-3 mt-1">
            Buat kelas, bagikan kode kelas ke mahasiswa, dan pantau jumlah pendaftar per kelas.
          </p>
        </div>

        {/* Ringkasan agregat — total mahasiswa lintas semua kelas + breakdown per angkatan */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-5">
          <StatCard bar="var(--terra)" val={String(classes.length)} label="Total kelas" />
          <StatCard bar="var(--sage)" val={String(summary.totalStudents)} label="Total mahasiswa" />
          {summary.byAngkatan.map((a) => (
            <StatCard key={a.angkatan} bar="#8B7EC8" val={String(a.total)} label={`Angkatan ${a.angkatan}`} />
          ))}
        </div>

        {/* Form tambah kelas */}
        <form
          onSubmit={handleCreate}
          className="bg-ivory rounded-2xl border p-4 md:p-5 mb-5 flex flex-col gap-3.5"
          style={BORDER}
        >
          <span className="text-sm font-semibold text-brown">+ Buat Kelas Baru</span>
          {formError && (
            <div className="text-red text-sm rounded-lg px-3 py-2.5 border border-red/30 bg-red/10">{formError}</div>
          )}
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
              Nama Kelas
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Kelas A"
                required
                maxLength={80}
                className="h-11 rounded-lg border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
              Angkatan
              <input
                type="number"
                value={angkatan}
                onChange={(e) => setAngkatan(parseInt(e.target.value, 10) || CURRENT_YEAR)}
                min={2000}
                max={2100}
                required
                className="h-11 rounded-lg border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2">
              Kapasitas Maksimal
              <input
                type="number"
                value={maxStudents}
                onChange={(e) => setMaxStudents(parseInt(e.target.value, 10) || 1)}
                min={1}
                required
                className="h-11 rounded-lg border px-3 text-base text-brown"
                style={BORDER}
              />
            </label>
          </div>
          <p className="text-[11px] text-brown-3">
            Kode kelas dibuat otomatis secara acak setelah kelas disimpan — tidak bisa diisi manual.
          </p>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="self-start h-11 px-5 rounded-lg text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: 'var(--terra)' }}
          >
            {creating ? 'Membuat…' : 'Buat Kelas'}
          </button>
        </form>

        {/* Daftar kelas */}
        <div className="bg-ivory rounded-2xl border overflow-hidden" style={BORDER}>
          <div className="flex items-center justify-between px-4 py-3.5 border-b" style={BORDER}>
            <span className="text-sm font-semibold text-brown">Daftar Kelas</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-bg3">
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3">Nama Kelas</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-24">Angkatan</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-40">Kode Kelas</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-28">Mahasiswa</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-brown-3 w-16">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-brown-3 text-sm">
                      Memuat…
                    </td>
                  </tr>
                ) : classes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-brown-3 text-sm">
                      Belum ada kelas. Buat kelas pertama Anda di atas.
                    </td>
                  </tr>
                ) : (
                  classes.map((k) => {
                    const full = k.studentCount >= k.max_students
                    return (
                      <tr key={k.id} className="border-t" style={BORDER}>
                        <td className="px-3 py-2.5 font-medium text-brown min-w-[140px]">{k.name}</td>
                        <td className="px-3 py-2.5 text-brown-2">{k.angkatan}</td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => void copyCode(k.code)}
                            title="Salin kode kelas"
                            aria-label={`Salin kode kelas ${k.code}`}
                            className="inline-flex items-center gap-1.5 h-11 px-2.5 rounded-md border font-mono text-xs font-semibold text-brown-2 whitespace-nowrap"
                            style={BORDER}
                          >
                            {k.code} <IconLink size={13} />
                          </button>
                        </td>
                        <td className="px-3 py-2.5">
                          <span
                            className="text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={
                              full
                                ? { background: '#FAD7A0', color: '#7D4E00' }
                                : { background: '#C0DD97', color: '#27500A' }
                            }
                          >
                            {k.studentCount}/{k.max_students}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <button
                            onClick={() => setDeleteTarget(k)}
                            aria-label={`Hapus kelas ${k.name}`}
                            className="w-11 h-11 rounded-md border border-red/20 bg-red/10 text-red flex items-center justify-center"
                          >
                            <IconTrash size={15} />
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Hapus kelas — aksi destruktif, WAJIB modal konfirmasi (CLAUDE.md) */}
      {deleteTarget && (
        <div
          className="fixed inset-0 z-[700] flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,32,.48)', animation: 'fadeInBg 0.18s ease' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setDeleteTarget(null)
          }}
        >
          <div className="bg-ivory rounded-2xl p-6 max-w-sm w-full text-center" style={{ animation: 'slideUpModal 0.22s ease' }}>
            <h3 className="text-base font-semibold text-brown mb-1.5">Hapus kelas "{deleteTarget.name}"?</h3>
            <p className="text-sm text-brown-3 mb-5 leading-relaxed">
              {deleteTarget.studentCount > 0
                ? `Kelas ini punya ${deleteTarget.studentCount} mahasiswa terdaftar. Mereka TIDAK akan terhapus — hanya keluar dari kelas ini (class_id jadi kosong).`
                : 'Tindakan ini tidak dapat dibatalkan.'}
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 h-[38px] rounded-lg border text-sm text-brown-2"
                style={BORDER}
              >
                Batal
              </button>
              <button
                onClick={() => void confirmDelete()}
                disabled={deleting}
                className="flex-1 h-[38px] rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ background: 'var(--red)' }}
              >
                {deleting ? 'Menghapus…' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 px-5 py-2.5 rounded-full text-sm font-semibold z-[999] max-w-[calc(100vw-3rem)]"
          style={{ background: 'var(--brown)', color: 'var(--terra)', boxShadow: '0 6px 24px rgba(0,0,0,.25)' }}
        >
          {toast}
        </div>
      )}
    </Layout>
  )
}

function StatCard({ bar, val, label }: { bar: string; val: string; label: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border bg-ivory px-4 py-3.5" style={BORDER}>
      <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: bar }} />
      <div className="text-xl font-bold text-brown leading-none">{val}</div>
      <div className="text-[11px] text-brown-3 mt-1">{label}</div>
    </div>
  )
}

export default Kelas
