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
