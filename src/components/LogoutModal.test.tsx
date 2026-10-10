// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { LogoutModal } from './LogoutModal'

afterEach(cleanup)

describe('LogoutModal', () => {
  it('renders nothing when closed', () => {
    const html = renderToStaticMarkup(
      <LogoutModal open={false} onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(html).toBe('')
  })

  it('renders the confirmation copy and both buttons when open', () => {
    const html = renderToStaticMarkup(
      <LogoutModal open={true} onCancel={() => {}} onConfirm={() => {}} />,
    )
    expect(html).toContain('Yakin Ingin Keluar?')
    expect(html).toContain('Batal')
    expect(html).toContain('Keluar')
  })

  // Antrean #167: klik di luar kartu tidak boleh menutup modal; hanya Batal yang menutup.
  it('klik latar tidak memanggil onCancel, tombol Batal memanggilnya', () => {
    const onCancel = vi.fn()
    render(<LogoutModal open={true} onCancel={onCancel} onConfirm={() => {}} />)
    fireEvent.click(screen.getByText('Batal').closest('div[class*="fixed"]')!)
    expect(onCancel).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText('Batal'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
