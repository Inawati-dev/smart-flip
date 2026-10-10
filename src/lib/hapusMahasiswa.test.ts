import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #174: hapus akun mahasiswa lewat fungsi SQL hapus_mahasiswa.
const h = vi.hoisted(() => ({
  jawab: { data: 0 as unknown, error: null as null | { code?: string; message: string } },
  rpc: vi.fn(),
}))

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    rpc: (nama: string, arg: unknown) => {
      h.rpc(nama, arg)
      return Promise.resolve(h.jawab)
    },
  },
}))

import { hapusMahasiswa } from './kelas'

beforeEach(() => {
  h.rpc.mockClear()
  h.jawab = { data: 0, error: null }
})

describe('hapusMahasiswa', () => {
  it('mengirim daftar id dan mengembalikan jumlah yang benar-benar terhapus', async () => {
    h.jawab = { data: 2, error: null }
    expect(await hapusMahasiswa(['a', 'b', 'c'])).toBe(2)
    expect(h.rpc).toHaveBeenCalledWith('hapus_mahasiswa', { p_ids: ['a', 'b', 'c'] })
  })

  it('daftar kosong tidak memanggil server', async () => {
    expect(await hapusMahasiswa([])).toBe(0)
    expect(h.rpc).not.toHaveBeenCalled()
  })

  it('fungsi belum ada di basis data: pesan menyebut migration_v34', async () => {
    h.jawab = { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.hapus_mahasiswa(p_ids) in the schema cache' } }
    await expect(hapusMahasiswa(['a'])).rejects.toThrow(/migration_v34_hapus_mahasiswa\.sql/)
  })

  it('ditolak server (bukan dosen): pesan server diteruskan', async () => {
    h.jawab = { data: null, error: { code: '42501', message: 'Hanya dosen yang boleh menghapus akun mahasiswa' } }
    await expect(hapusMahasiswa(['a'])).rejects.toThrow('Hanya dosen yang boleh menghapus akun mahasiswa')
  })
})
