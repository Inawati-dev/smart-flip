import { describe, it, expect, vi } from 'vitest'

// Antrean #250: RLS v48 menolak diam-diam (0 baris) bila pemanggil bukan pengampu; klien harus melempar galat.
const h = vi.hoisted(() => ({ baris: [] as Array<{ id: number }> }))
vi.mock('./supabase', () => {
  const hasil = () => ({ select: async () => ({ data: h.baris, error: null }) })
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => ({
        update: () => ({ eq: hasil }),
        delete: () => ({ eq: hasil }),
        select: () => ({ eq: async () => ({ data: [], error: null }) }),
      }),
      storage: { from: () => ({ remove: async () => ({ error: null }) }) },
    },
  }
})

import { updateCourse, deleteCourse, BUKAN_PENGAMPU } from './courses'
import { simpanJadwal } from './jadwal'

describe('tulis mata kuliah oleh bukan pengampu', () => {
  it('updateCourse, deleteCourse, simpanJadwal melempar galat bila 0 baris berubah', async () => {
    h.baris = []
    await expect(updateCourse(1, { name: 'X' })).rejects.toThrow(BUKAN_PENGAMPU)
    await expect(deleteCourse(1)).rejects.toThrow(BUKAN_PENGAMPU)
    await expect(simpanJadwal(1, null, {})).rejects.toThrow(/pengampu/)
  })
  it('pengampu: tidak ada galat', async () => {
    h.baris = [{ id: 1 }]
    await expect(updateCourse(1, { name: 'X' })).resolves.toBeUndefined()
    await expect(simpanJadwal(1, null, {})).resolves.toBeUndefined()
  })
})
