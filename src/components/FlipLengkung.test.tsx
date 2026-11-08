// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { createRef } from 'react'

const perintah: string[] = []
let dipasang: HTMLElement[] = []
let opsi: Record<string, unknown> = {}
let flipCb: ((e: { data: unknown }) => void) | null = null
const setelan: Record<string, unknown> = { disableFlipByClick: true }
vi.mock('page-flip/dist/js/page-flip.module.js', () => ({
  PageFlip: class {
    constructor(_: HTMLElement, o: Record<string, unknown>) {
      opsi = o
      perintah.push('baru')
    }
    loadFromHTML(items: HTMLElement[]) {
      dipasang = items
    }
    on(_: string, cb: (e: { data: unknown }) => void) {
      flipCb = cb
      return this
    }
    getSettings() {
      return setelan
    }
    flipNext() {
      perintah.push('next:' + String(setelan.disableFlipByClick))
    }
    flipPrev() {
      perintah.push('prev:' + String(setelan.disableFlipByClick))
    }
    turnToPage(p: number) {
      perintah.push('ke:' + p)
    }
    destroy() {
      perintah.push('hancur')
    }
  },
}))

import { FlipLengkung, type FlipLengkungHandle } from './FlipLengkung'

beforeEach(() => {
  perintah.length = 0
  setelan.disableFlipByClick = true
})
afterEach(cleanup)

const dasar = { total: 6, lebar: 403, tinggi: 570, dua: true, awal: 1, gambar: {} as Record<number, string>, cap: null, onHalaman: () => {} }

describe('FlipLengkung', () => {
  it('membuat satu elemen per halaman: sampul dan sampul belakang keras, sisanya lunak; ukuran dikuantisasi kelipatan 8', () => {
    render(<FlipLengkung {...dasar} />)
    expect(dipasang).toHaveLength(6)
    expect(dipasang.map((e) => e.getAttribute('data-density'))).toEqual(['hard', 'soft', 'soft', 'soft', 'soft', 'hard'])
    expect(opsi).toMatchObject({ width: 400, height: 566, showCover: true, usePortrait: true, disableFlipByClick: true, startPage: 0 })
  })

  it('gambar dipasang bertahap ke elemen yang ada tanpa membangun ulang mesin', () => {
    const { rerender } = render(<FlipLengkung {...dasar} />)
    expect(dipasang[2].querySelector('img')?.getAttribute('src')).toBeNull()
    rerender(<FlipLengkung {...dasar} gambar={{ 3: 'data:image/jpeg;base64,AAA' }} />)
    expect(dipasang[2].querySelector('img')?.getAttribute('src')).toBe('data:image/jpeg;base64,AAA')
    expect(dipasang[2].getAttribute('data-siap')).toBe('1')
    expect(perintah.filter((p) => p === 'baru')).toHaveLength(1)
  })

  it('peristiwa flip melapor halaman kiri (indeks + 1); berikut dan sebelum membuka kunci klik hanya selama panggilan', () => {
    const lapor = vi.fn()
    const pegangan = createRef<FlipLengkungHandle>()
    render(<FlipLengkung {...dasar} ref={pegangan} onHalaman={lapor} />)
    flipCb?.({ data: 3 })
    expect(lapor).toHaveBeenCalledWith(4)
    pegangan.current?.berikut()
    pegangan.current?.sebelum()
    pegangan.current?.ke(5)
    expect(perintah.slice(1)).toEqual(['next:false', 'prev:false', 'ke:4'])
    expect(setelan.disableFlipByClick).toBe(true)
  })

  it('mesin dibangun ulang saat ukuran bergeser lebih dari satu langkah, dibongkar saat dilepas, dan mulai dari halaman terakhir', () => {
    const { rerender, unmount } = render(<FlipLengkung {...dasar} />)
    flipCb?.({ data: 2 })
    rerender(<FlipLengkung {...dasar} lebar={500} tinggi={707} />)
    expect(perintah.filter((p) => p === 'baru')).toHaveLength(2)
    expect(perintah).toContain('hancur')
    expect(opsi).toMatchObject({ startPage: 2 })
    unmount()
    expect(perintah.filter((p) => p === 'hancur')).toHaveLength(2)
  })
})
