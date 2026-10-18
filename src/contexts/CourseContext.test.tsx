// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Antrean #258: mahasiswa dikunci ke course_id profil; dosen dan mahasiswa tanpa mata kuliah tidak.
const h = vi.hoisted(() => ({ auth: { user: { id: 'u' }, role: 'mahasiswa', profile: { course_id: 2 }, loading: false } as Record<string, unknown> }))
vi.mock('./AuthContext', () => ({ useAuth: () => h.auth }))
vi.mock('../lib/supabase', () => ({ isSupabaseConfigured: false, supabase: {} }))
vi.mock('../lib/courses', () => ({
  fetchCourses: async () => [{ id: 1, name: 'MPP', is_active: true }, { id: 2, name: 'PD', is_active: true }],
  getSavedCourseId: () => 1,
  saveCourseId: () => {},
}))

import { CourseProvider, useCourse } from './CourseContext'

let ganti: (id: number) => void = () => {}
function Lihat() {
  const c = useCourse()
  ganti = c.setCourseId
  return <span>{`mk=${c.courseId} kunci=${c.terkunci}`}</span>
}
function tampil() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(<QueryClientProvider client={qc}><CourseProvider><Lihat /></CourseProvider></QueryClientProvider>)
}

describe('CourseProvider', () => {
  beforeEach(() => { h.auth = { user: { id: 'u' }, role: 'mahasiswa', profile: { course_id: 2 }, loading: false } })
  afterEach(cleanup)

  it('mahasiswa dengan course_id: mata kuliah profil dipakai dan setCourseId tidak memindahkan', async () => {
    tampil()
    await waitFor(() => expect(screen.getByText('mk=2 kunci=true')).toBeTruthy())
    act(() => ganti(1))
    expect(screen.getByText('mk=2 kunci=true')).toBeTruthy()
  })
  it('dosen tidak dikunci', async () => {
    h.auth = { user: { id: 'd' }, role: 'dosen', profile: { course_id: 2 }, loading: false }
    tampil()
    await waitFor(() => expect(screen.getByText('mk=1 kunci=false')).toBeTruthy())
  })
  it('mata kuliah profil tidak ada di daftar (ditutup): tidak dikunci', async () => {
    h.auth = { user: { id: 'u' }, role: 'mahasiswa', profile: { course_id: 9 }, loading: false }
    tampil()
    await waitFor(() => expect(screen.getByText('mk=1 kunci=false')).toBeTruthy())
  })
})
