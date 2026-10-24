import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import type { Course } from '../lib/courses'
import { isMissingCourseSchema } from '../lib/courses'
import type { ModuleRow } from '../lib/modules'
import { jadwalTopik, mingguBawaan, mingguDariTanggal, mingguMentah, simpanJadwal } from '../lib/jadwal'
import { TanggalInput } from './TanggalInput'
import { PillGroup } from './PillGroup'
import { indeksJadwal, labelNomor } from '../lib/jenisTopik'

const BORDER = { borderColor: 'var(--border)' } as const
const KOTAK = 'h-11 rounded-[var(--radius-control)] border px-3 text-base text-brown tabular-nums'
const TANGGAL_MIN = '2020-01-01'
const MODE = [
  { value: 'minggu', label: 'Minggu ke-' },
  { value: 'tanggal', label: 'Tanggal sendiri' },
]
const pendek = (t: Date) => t.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })

// Modal "Jadwal kuliah" (antrean #153): dosen mengisi tanggal pertemuan
// pertama dan, bila perlu, minggu ke berapa tiap topik dibuka. Tanggal buka
// materi dan tes formatif tiap topik langsung terlihat di barisnya.
export function JadwalModal({ course, modules, onClose }: { course: Course; modules: ModuleRow[]; onClose: () => void }) {
  const queryClient = useQueryClient()
  const urut = [...modules].sort((a, b) => a.order_num - b.order_num)
  const [mulai, setMulai] = useState(course.mulai_kuliah?.slice(0, 10) ?? '')
  const [minggu, setMinggu] = useState<Record<number, string>>(() =>
    Object.fromEntries(urut.map((m) => [m.id, m.minggu_mulai != null ? String(m.minggu_mulai) : ''])),
  )
  // Tanggal buka sendiri per topik (v53, antrean #309); mode 'tanggal' memakainya, 'minggu' memakai angka di atas.
  const [tanggal, setTanggal] = useState<Record<number, string>>(() =>
    Object.fromEntries(urut.map((m) => [m.id, m.tanggal_buka?.slice(0, 10) ?? ''])),
  )
  const [mode, setMode] = useState<Record<number, 'minggu' | 'tanggal'>>(() =>
    Object.fromEntries(urut.map((m) => [m.id, m.tanggal_buka ? 'tanggal' : 'minggu'])),
  )
  const [saving, setSaving] = useState(false)
  const [galat, setGalat] = useState('')

  const angka = (id: number): number | null => (minggu[id] === '' || minggu[id] == null ? null : Number(minggu[id]))
  // Angka minggu topik bermode "Tanggal sendiri" tersembunyi, jadi tidak ikut diperiksa.
  const mingguSah = urut.every((m) => {
    if (mode[m.id] === 'tanggal') return true
    const n = angka(m.id)
    return n == null || (Number.isInteger(n) && n >= 1 && n <= 52)
  })
  // Tahun di bawah 100 dibaca JavaScript sebagai 19xx, jadi kuncinya diam-diam mati.
  const tanggalSah = !mulai || (mulai >= TANGGAL_MIN && mulai <= '2099-12-31')
  const tanggalSendiri = (id: number): string | null => (mode[id] === 'tanggal' && tanggal[id] ? tanggal[id] : null)
  const tanggalTopikSah = urut.every((m) => {
    const t = tanggalSendiri(m.id)
    return !t || (t >= TANGGAL_MIN && t <= '2099-12-31')
  })
  // Minggu turunan disimpan ke minggu_mulai yang dibatasi 1-52 (CHECK v29): tanggal yang lebih jauh ditolak di sini.
  const tanggalTopikDekat = !mulai || urut.every((m) => {
    const t = tanggalSendiri(m.id)
    return !t || mingguMentah(mulai, t) <= 52
  })
  const sah = mingguSah && tanggalSah && tanggalTopikSah && tanggalTopikDekat
  const pratinjau = sah
    ? jadwalTopik(
        mulai || null,
        urut.map((m) => ({ id: m.id, jenis: m.jenis, minggu_mulai: mode[m.id] === 'tanggal' ? null : angka(m.id), tanggal_buka: tanggalSendiri(m.id) })),
      )
    : null

  async function simpan() {
    setSaving(true)
    setGalat('')
    let tersimpan = false
    try {
      // Topik ber-tanggal sendiri disimpan dengan minggu turunannya supaya label pertemuan ikut.
      const mingguSimpan = (id: number) => {
        const t = tanggalSendiri(id)
        if (t) return mulai ? mingguDariTanggal(mulai, t) : null
        return mode[id] === 'tanggal' ? null : angka(id)
      }
      // Hanya topik yang punya atau pernah punya tanggal sendiri yang ditulis, supaya kolom v53 yang belum ada tidak mengganggu.
      const tanggalSimpan = Object.fromEntries(urut.filter((m) => tanggalSendiri(m.id) || m.tanggal_buka).map((m) => [m.id, tanggalSendiri(m.id)]))
      await simpanJadwal(course.id, mulai || null, Object.fromEntries(urut.map((m) => [m.id, mingguSimpan(m.id)])), tanggalSimpan)
      tersimpan = true
    } catch (e) {
      setGalat(
        isMissingCourseSchema(e)
          ? 'Kolom jadwal belum ada di basis data. Jalankan migration_v29_jadwal_kuliah.sql di Supabase dulu.'
          : (e as { message?: string } | null)?.message || 'Gagal menyimpan jadwal',
      )
    }
    // Disegarkan juga saat gagal: sebagian baris bisa sudah tersimpan.
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['courses'] }),
      queryClient.invalidateQueries({ queryKey: ['modules'] }),
    ])
    setSaving(false)
    if (tersimpan) onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[700] flex items-center justify-center p-4"
      style={{ background: 'var(--overlay)', animation: 'fadeInBg 0.18s ease' }}
    >
      <div className="bg-ivory rounded-2xl modal-lebar p-5" style={{ animation: 'slideUpModal 0.22s ease' }}>
        <h3 className="text-base font-semibold text-brown mb-1">Jadwal Kuliah</h3>
        <p className="text-xs text-brown-3 mb-4">
          {course.name}. Materi topik terbuka di minggu yang ditentukan, tes formatifnya satu minggu sesudah itu dan tetap terbuka bagi yang belum lulus.
          Kosongkan tanggal untuk mematikan kunci tanggal.
        </p>
        <label className="flex flex-col gap-1 text-xs font-semibold text-brown-2 mb-4">
          Tanggal Pertemuan Pertama
          <TanggalInput ariaLabel="Tanggal pertemuan pertama" min={TANGGAL_MIN} max="2099-12-31" value={mulai} onChange={setMulai} />
        </label>
        <div className="text-[11px] font-bold uppercase tracking-wide text-brown-3 mb-1">Minggu Tiap Topik</div>
        <ul className="flex flex-col mb-4">
          {urut.map((m, i) => {
            const j = pratinjau?.get(m.id)
            return (
              <li key={m.id} className="row-divider flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-brown line-clamp-2">
                    {labelNomor(urut, i, false)} · {m.title}
                  </div>
                  <div className="text-[11px] text-brown-3">
                    {j
                      ? `Materi ${pendek(j.materi)} · Tes formatif ${pendek(j.formatif)}`
                      : mode[m.id] === 'tanggal'
                        ? 'Pilih tanggal buka'
                        : mulai
                          ? 'Minggu tidak sah'
                          : 'Belum ada tanggal mulai'}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:flex-shrink-0">
                  <PillGroup
                    size="sm"
                    ariaLabel={`Cara mengatur tanggal topik ${m.order_num}`}
                    options={MODE}
                    value={mode[m.id] ?? 'minggu'}
                    onChange={(v) => setMode((s) => ({ ...s, [m.id]: v as 'minggu' | 'tanggal' }))}
                  />
                  {mode[m.id] === 'tanggal' ? (
                    <div className="w-44 max-w-full">
                      <TanggalInput
                        ariaLabel={`Tanggal buka topik ${m.order_num}`}
                        min={TANGGAL_MIN}
                        max="2099-12-31"
                        value={tanggal[m.id] ?? ''}
                        onChange={(v) => setTanggal((s) => ({ ...s, [m.id]: v }))}
                      />
                    </div>
                  ) : (
                    <input
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={52}
                      aria-label={`Minggu ke berapa topik ${m.order_num} dibuka`}
                      placeholder={String(mingguBawaan(indeksJadwal(urut, i)))}
                      value={minggu[m.id] ?? ''}
                      onChange={(e) => setMinggu((s) => ({ ...s, [m.id]: e.target.value }))}
                      className={`${KOTAK} w-20 flex-shrink-0 text-center`}
                      style={BORDER}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        <p className="text-[11px] text-brown-3 mb-3">
          Angka kosong memakai bawaan: dua minggu per topik, minggu 7 dan 8 dilewati untuk cadangan dan UTS. Tanggal sendiri menang atas minggu dan tetap berlaku walau tanggal pertemuan pertama kosong.
        </p>
        {!mingguSah && <p className="text-xs text-danger mb-3">Minggu harus bilangan bulat 1 sampai 52.</p>}
        {!tanggalTopikSah && <p className="text-xs text-danger mb-3">Tanggal buka topik harus antara tahun 2020 dan 2099.</p>}
        {!tanggalTopikDekat && <p className="text-xs text-danger mb-3">Tanggal buka topik paling lambat 52 minggu sesudah tanggal pertemuan pertama.</p>}
        {!tanggalSah && <p className="text-xs text-danger mb-3">Tanggal harus antara tahun 2020 dan 2099.</p>}
        {galat && <p className="text-xs text-danger mb-3">{galat}</p>}
        <div className="flex gap-2.5 justify-end">
          <button onClick={onClose} className="btn btn-secondary">
            Batal
          </button>
          <button onClick={() => void simpan()} disabled={!sah || saving} className="btn btn-primary min-w-[7.5rem]">
            {saving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
