// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mode Supabase hidup (antrean #226 butir 4). Modul dimuat ulang tiap uji karena "fungsi belum ada" diingat di tingkat modul.
const rpc = vi.fn()
const uid = vi.hoisted(() => ({ nilai: 'u1' as string | null }))
vi.mock('./supabase', () => ({
  supabase: { auth: { getUser: async () => ({ data: { user: uid.nilai ? { id: uid.nilai } : null } }) }, rpc: (...a: unknown[]) => rpc(...a) },
  isSupabaseConfigured: true,
}))

const muat = async () => {
  vi.resetModules()
  return import('./progress')
}

describe('tambahWaktuBaca', () => {
  beforeEach(() => {
    rpc.mockReset()
    localStorage.clear()
    uid.nilai = 'u1'
  })

  it('memanggil RPC tambah_waktu_baca dengan selisih detik', async () => {
    rpc.mockResolvedValue({ data: 120, error: null })
    const { tambahWaktuBaca } = await muat()
    expect(await tambahWaktuBaca(3, 120)).toBe(true)
    expect(rpc).toHaveBeenCalledWith('tambah_waktu_baca', { p_module_id: 3, p_detik: 120 })
  })

  it('fungsi belum ada (PGRST202): mengembalikan false dan tidak mencoba lagi', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: 'PGRST202', message: 'Could not find the function public.tambah_waktu_baca' } })
    const { tambahWaktuBaca } = await muat()
    expect(await tambahWaktuBaca(3, 10)).toBe(false)
    expect(await tambahWaktuBaca(3, 10)).toBe(false)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('fungsi belum ada (hanya pesan): mengembalikan false', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Could not find the function public.tambah_waktu_baca(p_detik, p_module_id) in the schema cache' } })
    const { tambahWaktuBaca } = await muat()
    expect(await tambahWaktuBaca(3, 10)).toBe(false)
  })

  it('galat lain dilempar supaya selisih dikirim ulang', async () => {
    rpc.mockResolvedValue({ data: null, error: { code: '08006', message: 'koneksi putus' } })
    const { tambahWaktuBaca } = await muat()
    await expect(tambahWaktuBaca(3, 10)).rejects.toMatchObject({ message: 'koneksi putus' })
  })

  it('Supabase aktif tanpa pengguna: melempar dan tidak menulis localStorage (selisih dicoba ulang)', async () => {
    uid.nilai = null
    localStorage.setItem('sfp_time_4', '95')
    const { tambahWaktuBaca } = await muat()
    await expect(tambahWaktuBaca(4, 30)).rejects.toThrow()
    expect(localStorage.getItem('sfp_time_4')).toBe('95')
    expect(rpc).not.toHaveBeenCalled()
  })
})
