// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Antrean #176: simpan profil memakai update (bukan upsert tanpa `role`) dan
// melempar bila basis data menolak, supaya layar tidak menulis "berhasil".
const h = vi.hoisted(() => ({
  uid: 'u1' as string | null,
  jawab: { data: [{ id: 'u1' }] as unknown, error: null as null | { message: string } },
  update: vi.fn(),
  eq: vi.fn(),
  upsert: vi.fn(),
}))

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: { getUser: async () => ({ data: { user: h.uid ? { id: h.uid } : null } }) },
    from: () => ({
      upsert: h.upsert,
      update: (row: unknown) => {
        h.update(row)
        return {
          eq: (kolom: string, nilai: string) => {
            h.eq(kolom, nilai)
            return { select: () => Promise.resolve(h.jawab) }
          },
        }
      },
    }),
  },
}))

import { saveProfilExtra } from './profil'

beforeEach(() => {
  localStorage.clear()
  h.update.mockClear()
  h.eq.mockClear()
  h.upsert.mockClear()
  h.uid = 'u1'
  h.jawab = { data: [{ id: 'u1' }], error: null }
})

describe('saveProfilExtra dengan Supabase', () => {
  it('memakai update pada baris sendiri, tanpa upsert dan tanpa kolom id/role', async () => {
    await saveProfilExtra({ nama: 'Johan', nim: '123', avatarUrl: 'data:image/jpeg;base64,AAA' })
    expect(h.upsert).not.toHaveBeenCalled()
    expect(h.update).toHaveBeenCalledWith({ full_name: 'Johan', nim_nidn: '123', avatar_url: 'data:image/jpeg;base64,AAA' })
    expect(h.eq).toHaveBeenCalledWith('id', 'u1')
  })

  it('avatarUrl tidak dikirim: kolom foto tidak disentuh', async () => {
    await saveProfilExtra({ nama: 'Johan' })
    expect(h.update.mock.calls[0][0]).not.toHaveProperty('avatar_url')
  })

  it('foto dihapus (teks kosong) tetap dikirim supaya foto lama terbuang', async () => {
    await saveProfilExtra({ nama: 'Johan', avatarUrl: '' })
    expect(h.update.mock.calls[0][0]).toMatchObject({ avatar_url: '' })
  })

  it('basis data menolak: pesan server dilempar', async () => {
    h.jawab = { data: null, error: { message: 'null value in column "role" violates not-null constraint' } }
    await expect(saveProfilExtra({ nama: 'Johan' })).rejects.toThrow(/not-null/)
  })

  it('nol baris berubah: dilempar, bukan dianggap berhasil', async () => {
    h.jawab = { data: [], error: null }
    await expect(saveProfilExtra({ nama: 'Johan' })).rejects.toThrow(/tidak tersimpan/)
  })

  it('sesi habis: dilempar sebelum menyentuh tabel', async () => {
    h.uid = null
    await expect(saveProfilExtra({ nama: 'Johan' })).rejects.toThrow(/Sesi berakhir/)
    expect(h.update).not.toHaveBeenCalled()
  })
})
