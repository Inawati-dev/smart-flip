// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

// Antrean #258: mahasiswa terkunci ke mata kuliah profilnya, jadi pemilih tidak ditampilkan.
const h = vi.hoisted(() => ({ terkunci: false }))
vi.mock('../contexts/CourseContext', () => ({
  useCourse: () => ({
    courses: [{ id: 1, name: 'Metode Penelitian', is_active: true }, { id: 2, name: 'Perpustakaan Digital', is_active: true }],
    courseId: 1,
    course: { id: 1, name: 'Metode Penelitian', is_active: true },
    setCourseId: () => {},
    isLoading: false,
    terkunci: h.terkunci,
  }),
}))

import { MataKuliahSelect } from './MataKuliahSelect'

describe('MataKuliahSelect', () => {
  afterEach(cleanup)
  it('terkunci: hanya nama mata kuliah, tanpa pemilih', () => {
    h.terkunci = true
    render(<MataKuliahSelect />)
    expect(screen.getByText('Metode Penelitian')).toBeTruthy()
    expect(screen.queryByLabelText('Pilih mata kuliah')).toBeNull()
  })
  it('tidak terkunci dan lebih dari satu mata kuliah: pemilih tampil', () => {
    h.terkunci = false
    render(<MataKuliahSelect />)
    expect(screen.getByLabelText('Pilih mata kuliah')).toBeTruthy()
  })
})
