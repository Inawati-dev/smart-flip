// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { impor, galatMuatPaket } from './lazyRetry'

describe('impor', () => {
  it('mengulang unduhan yang gagal lalu berhasil', async () => {
    const pabrik = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch dynamically imported module')).mockResolvedValue({ default: 'ok' })
    await expect(impor(pabrik, [1, 1])).resolves.toEqual({ default: 'ok' })
    expect(pabrik).toHaveBeenCalledTimes(2)
  })

  it('menyerah setelah semua jeda habis dan melempar galat terakhir', async () => {
    const pabrik = vi.fn().mockRejectedValue(new Error('putus'))
    await expect(impor(pabrik, [1, 1])).rejects.toThrow('putus')
    expect(pabrik).toHaveBeenCalledTimes(3)
  })
})

describe('galatMuatPaket', () => {
  it('mengenali galat unduh paket dan jaringan, bukan galat kode', () => {
    expect(galatMuatPaket(new TypeError('Failed to fetch dynamically imported module: https://x/a.js'))).toBe(true)
    expect(galatMuatPaket(new Error('Loading chunk 12 failed'))).toBe(true)
    expect(galatMuatPaket(new TypeError('Cannot read properties of undefined'))).toBe(false)
  })
})
