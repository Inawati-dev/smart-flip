import { Select } from './Select'
import { tahunUnik, namaKelasUnik, type FilterTahunKelas } from '../lib/kelas'

interface KelasTahunFilterProps {
  kelasList: Array<{ name: string; angkatan: number }>
  tahun: number | null
  kelas: string | null
  onChange: (filter: FilterTahunKelas) => void
}

// Dua filter berdampingan (tahun/angkatan, kelas) menggantikan satu dropdown
// gabungan "Kelas A · 2026" yang susah dibaca begitu kombinasinya banyak
// (screenshot Johan 16 Sep 2026, dipakai Asesmen.tsx dan Dashboard.tsx
// DosenHome). Opsi kelas mengikuti tahun terpilih; ganti tahun yang membuat
// kelas terpilih tidak lagi ada di tahun itu mengosongkan kelas.
export function KelasTahunFilter({ kelasList, tahun, kelas, onChange }: KelasTahunFilterProps) {
  const tahunOptions = [
    { value: '', label: 'Semua tahun' },
    ...tahunUnik(kelasList).map((t) => ({ value: String(t), label: String(t) })),
  ]
  const kelasOptions = [
    { value: '', label: 'Semua kelas' },
    ...namaKelasUnik(kelasList, tahun).map((n) => ({ value: n, label: n })),
  ]

  function handleTahun(v: string) {
    const nextTahun = v === '' ? null : Number(v)
    const nextKelas = kelas != null && !namaKelasUnik(kelasList, nextTahun).includes(kelas) ? null : kelas
    onChange({ tahun: nextTahun, kelas: nextKelas })
  }

  function handleKelas(v: string) {
    onChange({ tahun, kelas: v === '' ? null : v })
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Select value={tahun == null ? '' : String(tahun)} onChange={handleTahun} options={tahunOptions} size="sm" aria-label="Filter tahun" />
      <Select value={kelas ?? ''} onChange={handleKelas} options={kelasOptions} size="sm" aria-label="Filter kelas" />
    </div>
  )
}
