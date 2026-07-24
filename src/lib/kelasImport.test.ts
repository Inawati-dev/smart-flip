// @vitest-environment jsdom
//
// Split from kelas.test.ts because importMahasiswaCSV needs
// isSupabaseConfigured: true (it deliberately has NO demo/localStorage
// fallback -- see kelas.ts), while every other test in kelas.test.ts relies
// on the real (unconfigured-in-test-env) module so its localStorage
// fallback paths run. vi.mock is file-scoped, so this needed its own file
// rather than toggling the flag mid-file.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.hoisted so `invokeMock` exists by the time the (also hoisted) vi.mock
// factory below runs -- a plain top-level const would still be
// uninitialized at that point.
const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }))

vi.mock('./supabase', () => ({
  supabase: { functions: { invoke: invokeMock } },
  isSupabaseConfigured: true,
}))

import { importMahasiswaCSV, type ImportResult } from './kelas'

describe('importMahasiswaCSV (Supabase configured)', () => {
  beforeEach(() => invokeMock.mockClear())

  it('invokes the import-mahasiswa Edge Function with { classId, students } and returns its results array', async () => {
    const results: ImportResult[] = [
      { nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id', status: 'berhasil', password: 'Xy9!zAq2#mLp' },
    ]
    invokeMock.mockResolvedValueOnce({
      data: { results, summary: { total: 1, berhasil: 1, kelas_penuh: 0, error: 0 } },
      error: null,
    })

    const students = [{ nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id' }]
    const out = await importMahasiswaCSV('class-1', students)

    expect(invokeMock).toHaveBeenCalledWith('import-mahasiswa', {
      body: { classId: 'class-1', students },
    })
    expect(out).toEqual(results)
  })

  it('propagates an error returned by the Edge Function invocation', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: new Error('kelas tidak ditemukan') })
    await expect(
      importMahasiswaCSV('class-1', [{ nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id' }]),
    ).rejects.toThrow('kelas tidak ditemukan')
  })

  it('throws when the function returns no data and no error', async () => {
    invokeMock.mockResolvedValueOnce({ data: null, error: null })
    await expect(
      importMahasiswaCSV('class-1', [{ nama: 'Budi', nim: '220101', email: 'budi@kampus.ac.id' }]),
    ).rejects.toThrow(/respons/i)
  })

  it('still rejects an empty student list even though Supabase is configured', async () => {
    await expect(importMahasiswaCSV('class-1', [])).rejects.toThrow()
    expect(invokeMock).not.toHaveBeenCalled()
  })
})
