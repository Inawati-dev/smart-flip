import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #316: nomor urut topik baru tidak boleh bentrok dengan UNIQUE (course_id, order_num).
const h = vi.hoisted(() => ({ terbesar: 0 as number | null, sisip: [] as Array<Record<string, unknown>> }))
vi.mock('./supabase', () => {
  const pilih = {
    eq: () => pilih,
    order: () => pilih,
    limit: async () => ({ data: h.terbesar == null ? [] : [{ order_num: h.terbesar }], error: null }),
  }
  return {
    isSupabaseConfigured: true,
    supabase: {
      from: () => ({
        select: () => pilih,
        insert: (baris: Record<string, unknown>) => {
          h.sisip.push(baris)
          return { select: () => ({ single: async () => ({ data: { id: 99 }, error: null }) }) }
        },
      }),
    },
  }
})
import { createModulReturningId } from './manajemen'

beforeEach(() => {
  h.sisip = []
})

describe('createModulReturningId nomor urut', () => {
  it('memakai nomor terbesar + 1 bila topik tersimpan lebih banyak dari yang tampil', async () => {
    h.terbesar = 9
    await createModulReturningId({ judul: 'Pendahuluan', deskripsi: '', orderNum: 7, courseId: 1 })
    expect(h.sisip[0].order_num).toBe(10)
  })
  it('tetap memakai usulan bila lebih besar dan mata kuliah masih kosong', async () => {
    h.terbesar = null
    await createModulReturningId({ judul: 'Satu', deskripsi: '', orderNum: 1, courseId: 1 })
    expect(h.sisip[0].order_num).toBe(1)
  })
})
