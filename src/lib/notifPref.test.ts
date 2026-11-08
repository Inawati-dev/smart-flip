// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

const perbarui = vi.fn()
const pilih = vi.fn()
vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({
      update: (v: unknown) => ({ eq: (k: string, id: string) => perbarui(v, k, id) }),
      select: () => ({ eq: () => ({ maybeSingle: () => pilih() }) }),
    }),
  },
}))
vi.mock('../contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))

import { tulisNotifAktif, sinkronNotifAktif, bacaNotifAktif, kunciNotif, kunciNotifTunda, uraiJenisNotif, tulisJenisNotif, kunciJenisNotif } from './notifPref'

beforeEach(() => {
  localStorage.clear()
  perbarui.mockReset()
  pilih.mockReset()
})

describe('tulisNotifAktif', () => {
  it('menulis lokal seketika dan mengirim ke akun; berhasil = tidak tertunda', async () => {
    perbarui.mockResolvedValue({ error: null })
    await tulisNotifAktif('u1', false)
    expect(localStorage.getItem(kunciNotif('u1'))).toBe('0')
    expect(perbarui).toHaveBeenCalledWith({ notif_aktif: false }, 'id', 'u1')
    expect(localStorage.getItem(kunciNotifTunda('u1'))).toBeNull()
  })

  it('gagal kirim (luring atau kolom belum ada): lokal tetap berlaku dan ditandai tertunda', async () => {
    perbarui.mockResolvedValue({ error: { code: '42703', message: 'column "notif_aktif" does not exist' } })
    await tulisNotifAktif('u1', false)
    expect(bacaNotifAktif('u1')).toBe(false)
    expect(localStorage.getItem(kunciNotifTunda('u1'))).toBe('1')
  })

  it('belum masuk (tanpa id): hanya lokal, tidak menyentuh akun', async () => {
    await tulisNotifAktif(undefined, false)
    expect(perbarui).not.toHaveBeenCalled()
    expect(bacaNotifAktif(undefined)).toBe(false)
  })
})

describe('sinkronNotifAktif', () => {
  it('tanpa yang tertunda, nilai akun menang dan menimpa lokal', async () => {
    pilih.mockResolvedValue({ data: { notif_aktif: false }, error: null })
    expect(await sinkronNotifAktif('u1')).toBe('akun')
    expect(bacaNotifAktif('u1')).toBe(false)
    expect(perbarui).not.toHaveBeenCalled()
  })

  it('ada yang tertunda: nilai lokal dikirim ke akun dan akun tidak dibaca', async () => {
    localStorage.setItem(kunciNotif('u1'), '0')
    localStorage.setItem(kunciNotifTunda('u1'), '1')
    perbarui.mockResolvedValue({ error: null })
    expect(await sinkronNotifAktif('u1')).toBe('lokal')
    expect(perbarui).toHaveBeenCalledWith({ notif_aktif: false }, 'id', 'u1')
    expect(pilih).not.toHaveBeenCalled()
    expect(localStorage.getItem(kunciNotifTunda('u1'))).toBeNull()
  })

  it('kolom belum ada atau galat baca: lokal dipakai apa adanya', async () => {
    localStorage.setItem(kunciNotif('u1'), '0')
    pilih.mockResolvedValue({ data: null, error: { code: '42703', message: 'column does not exist' } })
    expect(await sinkronNotifAktif('u1')).toBe('tetap')
    expect(bacaNotifAktif('u1')).toBe(false)
  })

  it('sama dengan lokal: tidak berubah', async () => {
    pilih.mockResolvedValue({ data: { notif_aktif: true }, error: null })
    expect(await sinkronNotifAktif('u1')).toBe('tetap')
  })
})

describe('saklar per jenis (antrean #370)', () => {
  it('bawaan semua menyala; hanya false yang mematikan; isi rusak = semua menyala', () => {
    expect(uraiJenisNotif('')).toEqual({ pengingat: true, belajar: true, jadwal: true, mini: true })
    expect(uraiJenisNotif('{"jadwal":false,"mini":0,"asing":false}')).toEqual({ pengingat: true, belajar: true, jadwal: false, mini: true })
    expect(uraiJenisNotif('{bukan json')).toEqual({ pengingat: true, belajar: true, jadwal: true, mini: true })
  })

  it('menulis satu jenis tidak mengubah yang lain, per akun', () => {
    tulisJenisNotif('u1', 'jadwal', false)
    tulisJenisNotif('u1', 'mini', false)
    tulisJenisNotif('u1', 'mini', true)
    expect(uraiJenisNotif(localStorage.getItem(kunciJenisNotif('u1')) ?? '')).toEqual({ pengingat: true, belajar: true, jadwal: false, mini: true })
    expect(localStorage.getItem(kunciJenisNotif('u2'))).toBeNull()
  })
})
