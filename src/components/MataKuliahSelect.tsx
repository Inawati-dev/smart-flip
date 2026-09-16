import { Select } from './Select'
import { useCourse } from '../contexts/CourseContext'

// Pemilih mata kuliah di kepala halaman (Modul, Video, Asesmen, Dashboard).
// Satu komponen supaya bentuk dan lebarnya sama di semua halaman. Kalau
// hanya ada satu mata kuliah, tampilkan namanya saja tanpa dropdown.
export function MataKuliahSelect({ size = 'sm', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const { courses, courseId, setCourseId, course } = useCourse()
  if (courses.length <= 1) {
    return course ? <span className={`text-sm font-semibold text-brown ${className}`}>{course.name}</span> : null
  }
  return (
    <Select
      value={String(courseId)}
      onChange={(v) => setCourseId(parseInt(v, 10))}
      size={size}
      aria-label="Pilih mata kuliah"
      // Trigger melebar sampai selebar label mata kuliah terpanjang (Select.tsx
      // mengukur semua opsi, bukan cuma yang terpilih) — nama mata kuliah bisa
      // panjang ("Metode Penelitian dan Pengembangan"), jadi tanpa batas lebar
      // ini pemilih meluber di luar viewport telepon. `.select-trigger-label`
      // sudah truncate+ellipsis, batas ini yang bikin truncate itu kepakai.
      className={`max-w-[180px] sm:max-w-[260px]${className ? ` ${className}` : ''}`}
      options={courses.map((c) => ({ value: String(c.id), label: c.name }))}
    />
  )
}
