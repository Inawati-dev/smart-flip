import { useNavigate } from 'react-router'
import { useModules } from '../hooks/useModules'
import { labelPertemuan, nomorPertemuan } from '../lib/jadwal'
import { babSaja, indeksJadwal, isBagian, labelNomor } from '../lib/jenisTopik'

export type PertemuanStatus = 'done' | 'open' | 'locked'

// Deret pil dipakai di /modul, /video, /asesmen (spec §8.0). Satu pil per
// topik, urut order_num. Sejak antrean #283 pil menulis nomor pertemuan pertama
// topik menurut jadwal (P1, P3, P5, P9 ...), sama dengan judul halaman. WP1: statusOf default semua 'open' — kunci
// sebenarnya (topik n>1 terkunci sampai formatif n-1 lulus) dibuat WP6
// (src/lib/topik.ts, lihat spec §4.2).
export function PertemuanStepper({
  current,
  basePath,
  statusOf = () => 'open',
  tanpaBagian = false,
}: {
  current: number
  basePath: string
  statusOf?: (moduleId: number) => PertemuanStatus
  /** Lewati topik ber-jenis Bagian (antrean #321): halaman Video dan tes formatif. */
  tanpaBagian?: boolean
}) {
  const { data: modules = [] } = useModules()
  const navigate = useNavigate()
  const semua = [...modules].sort((a, b) => a.order_num - b.order_num)
  // Video dan tes formatif tidak punya Bagian (antrean #321), jadi stepper di halaman itu hanya memuat Bab.
  const sorted = tanpaBagian ? babSaja(semua) : semua

  return (
    <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Pertemuan">
      {sorted.map((m, i) => {
        const status = statusOf(m.id)
        const active = m.id === current
        const locked = status === 'locked'
        return (
          <button
            key={m.id}
            type="button"
            disabled={locked}
            title={locked ? 'Selesaikan topik sebelumnya dulu' : `${labelNomor(sorted, i, false)} · ${labelPertemuan(indeksJadwal(sorted, i), m.minggu_mulai)}`}
            aria-label={`${labelNomor(sorted, i, false)} · ${labelPertemuan(indeksJadwal(sorted, i), m.minggu_mulai)}${locked ? ', terkunci' : ''}`}
            onClick={() => navigate(`${basePath}/${m.id}`)}
            aria-current={active ? 'page' : undefined}
            className="step-pill shrink-0 w-11 h-11 rounded-full border flex items-center justify-center text-sm font-semibold"
            style={{
              background: active ? 'var(--brown)' : status === 'done' ? 'var(--sage)' : 'var(--ivory)',
              color: active || status === 'done' ? 'var(--cream)' : 'var(--brown)',
              borderColor: 'var(--border)',
              opacity: locked ? 0.5 : 1,
            }}
          >
            {isBagian(m) ? labelNomor(sorted, i).replace('Bagian ', '') : `P${nomorPertemuan(indeksJadwal(sorted, i), m.minggu_mulai, 1)}`}
          </button>
        )
      })}
    </div>
  )
}
