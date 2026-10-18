import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #255: reset tes diagnostik lewat reset_diagnostik_mahasiswa (v47), jalur lama hanya bila fungsi belum ada.
const h = vi.hoisted(() => ({
  rpc: vi.fn(),
  hapus: vi.fn(async () => ({ data: [{ id: 'a1' }], error: null })),
}))
vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: (...a: unknown[]) => h.rpc(...a),
    from: () => ({ delete: () => ({ eq: () => ({ eq: () => ({ in: () => ({ select: () => h.hapus() }) }) }) }) }),
  },
}))

import { resetDiagnostik } from './kelas'

describe('resetDiagnostik', () => {
  beforeEach(() => {
    h.rpc.mockReset()
    h.hapus.mockClear()
  })

  it('memakai hasil fungsi v47, baik berupa larik maupun objek', async () => {
    h.rpc.mockResolvedValueOnce({ data: [{ dihapus: 2, dikeluarkan: 2 }], error: null })
    expect(await resetDiagnostik(['u1', 'u2'], 1)).toEqual({ dihapus: 2, dikeluarkan: 2 })
    h.rpc.mockResolvedValueOnce({ data: { dihapus: 1, dikeluarkan: 0 }, error: null })
    expect(await resetDiagnostik(['u1'], 1)).toEqual({ dihapus: 1, dikeluarkan: 0 })
    expect(h.rpc).toHaveBeenCalledWith('reset_diagnostik_mahasiswa', { p_ids: ['u1'], p_course: 1 })
    expect(h.hapus).not.toHaveBeenCalled()
  })

  it('fungsi belum ada (PGRST202): jalur lama dipakai dan ditandai', async () => {
    h.rpc.mockResolvedValueOnce({ data: null, error: { code: 'PGRST202', message: 'Could not find the function' } })
    expect(await resetDiagnostik(['u1'], 1)).toEqual({ dihapus: 1, dikeluarkan: 0, jalurLama: true })
  })

  it('galat lain (mis. izin) dilempar, tidak diam-diam jatuh ke jalur lama', async () => {
    h.rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'permission denied for function reset_diagnostik_mahasiswa' } })
    await expect(resetDiagnostik(['u1'], 1)).rejects.toMatchObject({ code: '42501' })
    expect(h.hapus).not.toHaveBeenCalled()
  })
})
