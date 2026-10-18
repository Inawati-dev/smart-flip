import { describe, it, expect, vi } from 'vitest'
import { shouldSendTimeUpdate, TIMEUPDATE_THROTTLE_MS, upsertVideoProgress, fetchVideoProgressMap } from './videoProgress'

describe('shouldSendTimeUpdate (throttle 30 detik)', () => {
  it('mengirim saat belum pernah mengirim (lastSentAt null)', () => {
    expect(shouldSendTimeUpdate(null, 0)).toBe(true)
  })

  it('menahan kalau belum 30 detik sejak kiriman terakhir', () => {
    expect(shouldSendTimeUpdate(1000, 1000 + TIMEUPDATE_THROTTLE_MS - 1)).toBe(false)
  })

  it('mengirim tepat di batas 30 detik', () => {
    expect(shouldSendTimeUpdate(1000, 1000 + TIMEUPDATE_THROTTLE_MS)).toBe(true)
  })
})

describe('upsertVideoProgress / fetchVideoProgressMap (mode demo tanpa Supabase)', () => {
  vi.mock('./supabase', () => ({
    supabase: { auth: { getUser: async () => ({ data: { user: null } }) } },
    isSupabaseConfigured: false,
  }))

  it('upsertVideoProgress diam saja, tidak melempar error', async () => {
    await expect(upsertVideoProgress(1, 30, false)).resolves.toBeUndefined()
  })

  it('fetchVideoProgressMap mengembalikan objek kosong', async () => {
    expect(await fetchVideoProgressMap()).toEqual({})
  })
})

describe('upsertVideoProgress: panggilan ended → done=true', () => {
  it('meneruskan done=true dan seconds ke upsert Supabase', async () => {
    const upsertSpy = vi.fn(async () => ({ error: null }))
    vi.doMock('./supabase', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ upsert: upsertSpy }),
      },
      isSupabaseConfigured: true,
    }))
    vi.resetModules()
    const { upsertVideoProgress: upsertWithUser } = await import('./videoProgress')
    await upsertWithUser(3, 120, true)
    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1', module_id: 3, seconds: 120, done: true }),
      { onConflict: 'user_id,module_id' },
    )
    vi.doUnmock('./supabase')
  })

  // Antrean #191: membuka pemutar lagi (done=false) tidak boleh menghapus tanda selesai yang sudah tersimpan.
  it('tidak mengirim kolom done saat done=false, supaya tanda selesai tidak tertimpa', async () => {
    const upsertSpy = vi.fn<(baris: Record<string, unknown>, opsi: unknown) => Promise<{ error: null }>>(async () => ({ error: null }))
    vi.doMock('./supabase', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ upsert: upsertSpy }),
      },
      isSupabaseConfigured: true,
    }))
    vi.resetModules()
    const { upsertVideoProgress: upsertWithUser } = await import('./videoProgress')
    await upsertWithUser(3, 0, false)
    expect(upsertSpy.mock.calls[0][0]).toMatchObject({ user_id: 'u1', module_id: 3 })
    expect('done' in upsertSpy.mock.calls[0][0]).toBe(false)
    // antrean #225: detik 0 tidak dikirim, supaya detik tersimpan tidak tertimpa saat pemutar dibuka
    expect('seconds' in upsertSpy.mock.calls[0][0]).toBe(false)
    await upsertWithUser(3, 0, true)
    expect(upsertSpy.mock.calls[1][0]).toMatchObject({ done: true })
    expect('seconds' in upsertSpy.mock.calls[1][0]).toBe(false)
    vi.doUnmock('./supabase')
  })
})

// Antrean #271: video pertemuan kedua topik menulis kolom seconds_2/done_2, kolom pertama tidak tersentuh.
describe('upsertVideoProgress: pertemuan kedua', () => {
  it('menulis seconds_2 dan done_2, bukan seconds dan done', async () => {
    const upsertSpy = vi.fn<(baris: Record<string, unknown>, opsi: unknown) => Promise<{ error: null }>>(async () => ({ error: null }))
    vi.doMock('./supabase', () => ({
      supabase: {
        auth: { getUser: async () => ({ data: { user: { id: 'u1' } } }) },
        from: () => ({ upsert: upsertSpy }),
      },
      isSupabaseConfigured: true,
    }))
    vi.resetModules()
    const { upsertVideoProgress: upsertWithUser } = await import('./videoProgress')
    await upsertWithUser(3, 90, true, 2)
    const baris = upsertSpy.mock.calls[0][0]
    expect(baris).toMatchObject({ module_id: 3, seconds_2: 90, done_2: true })
    expect('seconds' in baris || 'done' in baris).toBe(false)
    vi.doUnmock('./supabase')
  })
})
