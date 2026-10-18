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
  /** Mahasiswa yang sudah punya mata kuliah di profil tidak bisa berpindah mata kuliah (antrean #258). */
  terkunci: boolean
}

const CourseContext = createContext<CourseContextValue>({
  courses: [],
  courseId: 1,
  course: null,
  setCourseId: () => {},
  isLoading: true,
  terkunci: false,
})

export function CourseProvider({ children }: { children: ReactNode }) {
  // Dosen melihat juga mata kuliah yang ditutup (antrean #141); mahasiswa tidak.
  const { user, role, profile, loading: authLoading } = useAuth()
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

  // Antrean #258: mahasiswa memakai mata kuliah di profilnya saja. Dulu ia bisa membuka mata kuliah
  // lain lewat pemilih, mengerjakan tes di sana, dan badge kelasnya tetap dari mata kuliah profil.
  // Mata kuliah profil yang ditutup (tidak ada di daftar) tidak dikunci: pilihan biasa berlaku.
  const mkProfil = role === 'mahasiswa' ? (profile?.course_id ?? null) : null
  const terkunci = mkProfil != null && courses.some((c) => c.id === mkProfil)
  const efektif = terkunci ? (mkProfil as number) : courseId
  const value = useMemo<CourseContextValue>(
    () => ({
      courses,
      courseId: efektif,
      course: courses.find((c) => c.id === efektif) ?? null,
      setCourseId: (id: number) => {
        if (terkunci) return
        setCourseIdState(id)
        saveCourseId(id)
      },
      isLoading,
      terkunci,
    }),
    [courses, efektif, isLoading, terkunci],
  )
  return <CourseContext.Provider value={value}>{children}</CourseContext.Provider>
}

export function useCourse(): CourseContextValue {
  return useContext(CourseContext)
}
