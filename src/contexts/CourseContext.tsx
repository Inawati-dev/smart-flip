import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchCourses, getSavedCourseId, saveCourseId, type Course } from '../lib/courses'
import { useAuth } from './AuthContext'
import { isSupabaseConfigured } from '../lib/supabase'

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
  // Dosen melihat juga mata kuliah yang ditutup (antrean #141); mahasiswa tidak.
  const { user, role, loading: authLoading } = useAuth()
  const dosen = role === 'dosen'
  // Daftar baru diambil sesudah ada sesi: tabel `courses` menolak pengunjung tanpa login,
  // jadi halaman login dulu memunculkan galat 401 di konsol (Papan #2).
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ['courses', dosen],
    queryFn: () => fetchCourses(dosen),
    staleTime: 5 * 60 * 1000,
    enabled: !isSupabaseConfigured || !!user,
  })
  const [courseId, setCourseIdState] = useState<number>(() => getSavedCourseId() ?? 1)

  // Kalau pilihan tersimpan tidak ada di daftar (mata kuliah dihapus atau
  // pengguna baru), jatuhkan ke mata kuliah pertama.
  // Tunggu peran diketahui: sebelum itu daftar hanya berisi yang dibuka, jadi
  // pilihan dosen pada mata kuliah yang ditutup akan ikut terbuang.
  useEffect(() => {
    if (authLoading || courses.length === 0) return
    if (!courses.some((c) => c.id === courseId)) {
      setCourseIdState(courses[0].id)
      saveCourseId(courses[0].id)
    }
  }, [courses, courseId, authLoading])

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
