// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  getModulCustom,
  saveModulCustom,
  getModulCustomMap,
  getModulOrder,
  saveModulOrder,
  createModulReturningId,
  uploadModulVideo,
  type ModulCustom,
} from './manajemen'

// isSupabaseConfigured is false in the test env (no VITE_SUPABASE_* vars set),
// so every call below exercises the localStorage fallback path — matches the
// existing precedent in forum.test.ts / profil.test.ts.

beforeEach(() => {
  localStorage.clear()
})

describe('getModulCustom / saveModulCustom (localStorage fallback)', () => {
  it('returns null when nothing is saved yet', async () => {
    expect(await getModulCustom(1)).toBeNull()
  })

  it('reads back exactly what was saved, under the exact legacy key', async () => {
    const data: ModulCustom = { judul: 'Modul Baru', deskripsi: 'Deskripsi baru', status: 'draf', durasi: '2 x 50 menit', catatan: 'Catatan privat' }
    await saveModulCustom(3, data)

    const raw = JSON.parse(localStorage.getItem('sfp_modul_custom_3')!) as ModulCustom
    expect(raw).toEqual(data)

    expect(await getModulCustom(3)).toEqual(data)
  })

  it('keeps each module id under its own key', async () => {
    await saveModulCustom(1, { judul: 'Satu' })
    await saveModulCustom(2, { judul: 'Dua' })
    expect(await getModulCustom(1)).toEqual({ judul: 'Satu' })
    expect(await getModulCustom(2)).toEqual({ judul: 'Dua' })
  })
})

describe('getModulCustomMap', () => {
  it('batches getModulCustom over every id', async () => {
    await saveModulCustom(1, { judul: 'Satu', status: 'aktif' })
    await saveModulCustom(2, { judul: 'Dua', status: 'terkunci' })

    const map = await getModulCustomMap([1, 2, 3])
    expect(map[1]).toEqual({ judul: 'Satu', status: 'aktif' })
    expect(map[2]).toEqual({ judul: 'Dua', status: 'terkunci' })
    expect(map[3]).toBeNull()
  })
})

describe('getModulOrder / saveModulOrder (localStorage fallback)', () => {
  it('returns null when nothing is saved yet', async () => {
    expect(await getModulOrder()).toBeNull()
  })

  it('reads back the saved order under the exact legacy key', async () => {
    await saveModulOrder([3, 1, 2])
    const raw = JSON.parse(localStorage.getItem('sfp_modul_order')!) as number[]
    expect(raw).toEqual([3, 1, 2])
    expect(await getModulOrder()).toEqual([3, 1, 2])
  })
})

// Antrean #43/#44a (16 Sep 2026). isSupabaseConfigured is false here (see
// note at top), so createModulReturningId has nowhere to persist a brand-new
// row — same self-guard as createModul — while uploadModulVideo (unlike
// createModul) has a genuine demo-mode fallback: no Storage backend, so it
// keeps the override local only, exactly like uploadModulPdf's own fallback.
describe('createModulReturningId (no Supabase in test env)', () => {
  it('throws because there is nowhere to persist a new module in demo mode', async () => {
    await expect(createModulReturningId({ judul: 'Baru', deskripsi: '', orderNum: 1 })).rejects.toThrow(
      /Supabase/,
    )
  })
})

describe('uploadModulVideo (localStorage fallback)', () => {
  it('stores an object URL under sfp_video_url_<id> when Supabase is not configured', async () => {
    const originalCreate = URL.createObjectURL
    URL.createObjectURL = vi.fn(() => 'blob:mock-video-url') as typeof URL.createObjectURL
    try {
      const file = new File(['x'], 'video.mp4', { type: 'video/mp4' })
      const url = await uploadModulVideo(5, file)
      expect(url).toBe('blob:mock-video-url')
      expect(localStorage.getItem('sfp_video_url_5')).toBe('"blob:mock-video-url"')
    } finally {
      URL.createObjectURL = originalCreate
    }
  })
})

describe('graceful localStorage failure handling', () => {
  it('getModulCustom returns null when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await getModulCustom(1)).toBeNull()
    spy.mockRestore()
  })

  it('getModulOrder returns null when localStorage.getItem throws', async () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('boom')
    })
    expect(await getModulOrder()).toBeNull()
    spy.mockRestore()
  })
})
