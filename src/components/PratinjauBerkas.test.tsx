// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { render, screen, cleanup, waitFor, fireEvent } from '@testing-library/react'

const signed = vi.fn()
vi.mock('../lib/tugasAkhir', () => ({ signedFileUrl: (p: string) => signed(p) }))
vi.mock('mammoth', () => ({ convertToHtml: async () => ({ value: '<h1>Bab 1</h1><p>Isi <b>proposal</b></p>' }) }))
vi.mock('./PembacaPdf', () => ({
  useCapAir: () => null,
  PembacaPdf: ({ src, kiri, aksi }: { src: string; kiri: React.ReactNode; aksi: React.ReactNode }) => (
    <div data-testid="pembaca" data-src={src}>
      {kiri}
      {aksi}
    </div>
  ),
}))

import { PratinjauBerkas, jenisBerkas, dokumenPratinjau } from './PratinjauBerkas'

beforeEach(() => {
  signed.mockReset()
  vi.stubGlobal('fetch', vi.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('jenisBerkas', () => {
  it('mengenali pdf dan docx dari nama atau alamat, apa pun huruf besarnya, selain itu lain', () => {
    expect(jenisBerkas('Bab1.PDF')).toBe('pdf')
    expect(jenisBerkas('u1/bab-1.docx?token=x')).toBe('docx')
    expect(jenisBerkas('catatan.txt')).toBe('lain')
    expect(jenisBerkas('tanpa-ekstensi')).toBe('lain')
  })
})

describe('dokumenPratinjau', () => {
  it('membungkus isi dalam dokumen utuh berkarakter UTF-8', () => {
    const d = dokumenPratinjau('<p>x</p>')
    expect(d).toContain('<meta charset="utf-8">')
    expect(d).toContain('<body><p>x</p></body>')
  })
})

describe('PratinjauBerkas', () => {
  it('docx: isi diubah dan tampil di iframe sandbox tanpa skrip; Unduh memakai alamat bertanda tangan', async () => {
    signed.mockResolvedValue('https://x.test/berkas/bab-1.docx?token=t')
    render(<PratinjauBerkas path="u1/bab-1.docx" onTutup={() => {}} />)
    const iframe = (await screen.findByTitle('Isi bab-1.docx')) as HTMLIFrameElement
    expect(iframe.getAttribute('sandbox')).toBe('')
    expect(iframe.getAttribute('srcdoc')).toContain('<h1>Bab 1</h1>')
    expect((screen.getByRole('link', { name: 'Unduh' }) as HTMLAnchorElement).href).toBe('https://x.test/berkas/bab-1.docx?token=t')
    expect(signed).toHaveBeenCalledWith('u1/bab-1.docx')
  })

  it('pdf: dibuka di pembaca flipbook dengan tombol Unduh dan Tutup', async () => {
    signed.mockResolvedValue('https://x.test/berkas/bab-2.pdf?token=t')
    const tutup = vi.fn()
    render(<PratinjauBerkas path="u1/bab-2.pdf" onTutup={tutup} />)
    const pembaca = await screen.findByTestId('pembaca')
    expect(pembaca.getAttribute('data-src')).toBe('https://x.test/berkas/bab-2.pdf?token=t')
    fireEvent.click(screen.getByRole('button', { name: 'Tutup' }))
    expect(tutup).toHaveBeenCalledTimes(1)
  })

  it('jenis lain: keterangan dan tombol Unduh saja; gagal membuka: pesan galat tanpa Unduh', async () => {
    signed.mockResolvedValue('https://x.test/berkas/catatan.txt?token=t')
    render(<PratinjauBerkas path="u1/catatan.txt" onTutup={() => {}} />)
    expect(await screen.findByText(/Pratinjau tidak tersedia/)).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Unduh' })).toBeTruthy()
    cleanup()

    signed.mockRejectedValue(new Error('putus'))
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    render(<PratinjauBerkas path="u1/bab-3.docx" onTutup={() => {}} />)
    expect(await screen.findByText(/Berkas tidak bisa dibuka/)).toBeTruthy()
    expect(screen.queryByRole('link', { name: 'Unduh' })).toBeNull()
  })

  it('Escape menutup pratinjau docx', async () => {
    signed.mockResolvedValue('https://x.test/berkas/bab-1.docx')
    const tutup = vi.fn()
    render(<PratinjauBerkas path="u1/bab-1.docx" onTutup={tutup} />)
    await waitFor(() => screen.getByTitle('Isi bab-1.docx'))
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(tutup).toHaveBeenCalled()
  })
})
