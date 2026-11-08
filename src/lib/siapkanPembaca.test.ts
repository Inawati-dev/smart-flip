// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./pdfWorkerUrl', () => ({ default: '/assets/pdf.worker.min-abc.js' }))
vi.mock('../components/PembacaPdf', () => ({ PembacaPdf: () => null }))

import { bolehPanaskan, siapkanPembaca, setelUlangPemanasan } from './siapkanPembaca'

beforeEach(() => {
  setelUlangPemanasan()
  document.head.querySelectorAll('link[data-pdf-worker]').forEach((e) => e.remove())
  vi.useFakeTimers()
})

describe('bolehPanaskan', () => {
  it('lewati bila penghemat data menyala atau jaringan 2G; selain itu jalan, juga tanpa info jaringan', () => {
    expect(bolehPanaskan(undefined)).toBe(true)
    expect(bolehPanaskan({ effectiveType: '4g' })).toBe(true)
    expect(bolehPanaskan({ saveData: true, effectiveType: '4g' })).toBe(false)
    expect(bolehPanaskan({ effectiveType: '2g' })).toBe(false)
    expect(bolehPanaskan({ effectiveType: 'slow-2g' })).toBe(false)
  })
})

describe('siapkanPembaca', () => {
  it('menjadwalkan sekali per sesi dan memasang satu tautan prefetch ke worker', async () => {
    expect(siapkanPembaca()).toBe(true)
    expect(siapkanPembaca()).toBe(false)
    await vi.advanceTimersByTimeAsync(2000)
    await vi.advanceTimersByTimeAsync(0)
    const link = document.head.querySelector('link[data-pdf-worker]') as HTMLLinkElement | null
    expect(link?.rel).toBe('prefetch')
    expect(link?.getAttribute('href')).toBe('/assets/pdf.worker.min-abc.js')
    expect(document.head.querySelectorAll('link[data-pdf-worker]')).toHaveLength(1)
  })
})
