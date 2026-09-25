import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchModules, fetchModuleById } from '../lib/modules'
import { useCourse } from '../contexts/CourseContext'

// Topik mata kuliah yang sedang dipilih (CourseContext). Semua halaman yang
// memanggil useModules() otomatis ikut mata kuliah terpilih.
export function useModules() {
  const { courseId } = useCourse()
  return useQuery({ queryKey: ['modules', 'course', courseId], queryFn: () => fetchModules(courseId) })
}

export function useModule(id: number) {
  return useQuery({ queryKey: ['modules', id], queryFn: () => fetchModuleById(id) })
}

// Antrean #106: tautan langsung ke topik milik mata kuliah lain memindahkan
// pilihan mata kuliah ke milik topik itu, supaya halaman tidak menulis
// "Pertemuan 0" atau "tidak ditemukan". Hanya berjalan saat topik berganti,
// jadi mahasiswa tetap bebas mengganti mata kuliah sesudahnya.
// Mengembalikan true selama pemindahan belum selesai.
export function useIkutiMataKuliah(moduleId: number | null): boolean {
  const { courseId, setCourseId } = useCourse()
  const { data: modul } = useQuery({
    queryKey: ['modules', moduleId],
    queryFn: () => fetchModuleById(moduleId as number),
    enabled: moduleId != null,
  })
  const target = modul?.course_id ?? null
  useEffect(() => {
    if (target != null && target !== courseId) setCourseId(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target])
  return target != null && target !== courseId
}
