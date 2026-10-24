// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { ZonaBerkas, cocokAccept } from './ModalBerkas'

afterEach(cleanup)

const berkas = (nama: string, tipe: string) => new File(['x'], nama, { type: tipe })

describe('cocokAccept', () => {
  it('ekstensi, MIME persis, dan MIME berbintang', () => {
    expect(cocokAccept(berkas('a.PDF', ''), 'application/pdf,.pdf')).toBe(true)
    expect(cocokAccept(berkas('a.exe', 'application/x-msdownload'), 'application/pdf,.pdf')).toBe(false)
    expect(cocokAccept(berkas('v.webm', 'video/webm'), 'video/*')).toBe(true)
    expect(cocokAccept(berkas('v.txt', 'text/plain'), 'video/mp4,video/webm')).toBe(false)
  })
})

describe('ZonaBerkas seret-lepas', () => {
  it('menolak berkas yang jenisnya tidak sesuai accept', () => {
    const onChange = vi.fn()
    render(<ZonaBerkas accept="application/pdf,.pdf" file={null} onChange={onChange} petunjuk="PDF, maks 20 MB." />)
    const zona = screen.getByText(/Seret berkas/).closest('div[class*="border-dashed"]') as HTMLElement
    fireEvent.drop(zona, { dataTransfer: { files: [berkas('virus.exe', 'application/x-msdownload')] } })
    expect(onChange).toHaveBeenLastCalledWith(null)
    expect(screen.getByText(/tidak sesuai/)).toBeTruthy()
  })
})
