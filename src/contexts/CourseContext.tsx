import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCourses, getSavedCourseId, saveCourseId, type Course } from '../lib/courses'

// Mata kuliah yang sedang dipilih, dipakai semua halaman (Modul, Video,
// Asesmen, Dashboard) lewat useCourse(). Pilihan tersimpan di localStorage
// supaya berpindah halaman atau memuat ulang tidak mengembalikan ke bawaan.
interface CourseContextValue {
  courses: Course[]
  courseId: number
  course: Course | null
  setCourseId: (id: number) => void
  isLoading: boolean
}

const CourseContext = createContext<CourseContextValue>({
  courses: [],
  courseId: 1,
  course: null,
  setCourseId: () => {},
  isLoading: true,
})

export function CourseProvider({ children }: { children: ReactNode }) {
  const { data: courses = [], isLoading } = useQuery({ queryKey: ['courses'], queryFn: fetchCourses, staleTime: 5 * 60 * 1000 })
  const [courseId, setCourseIdState] = useState<number>(() => getSavedCourseId() ?? 1)

  // Kalau pilihan tersimpan tidak ada di daftar (mata kuliah dihapus atau
  // pengguna baru), jatuhkan ke mata kuliah pertama.
  useEffect(() => {
    if (courses.length === 0) return
    if (!courses.some((c) => c.id === courseId)) {
      setCourseIdState(courses[0].id)
      saveCourseId(courses[0].id)
    }
  }, [courses, courseId])

  const value = useMemo<CourseContextValue>(
    () => ({
      courses,
      courseId,
      course: courses.find((c) => c.id === courseId) ?? null,
      setCourseId: (id: number) => {
        setCourseIdState(id)
        saveCourseId(id)
      },
      isLoading,
    }),
    [courses, courseId, isLoading],
  )
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
}

export function useCourse(): CourseContextValue {
  return useContext(CourseContext)
}
