// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { LogoutModal } from './LogoutModal'

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
    expect(html).toContain('Yakin ingin keluar?')
    expect(html).toContain('Batal')
    expect(html).toContain('Keluar')
  })
})
