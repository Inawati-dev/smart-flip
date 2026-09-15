import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router'
import { PertemuanStepper } from './PertemuanStepper'

const MODULES = [1, 2, 3].map((n) => ({
  id: n,
  order_num: n,
  title: `Modul ${n}`,
  description: null,
  video_url: null,
  pdf_path: null,
  is_active: true,
  path: '',
  videoId: null,
  color: 'var(--sage)',
  sub: '',
  capaian: [],
  materi: [],
  kuis: [],
  jurnal: [],
  studiKasus: [],
}))

function renderStepper(statusOf?: (id: number) => 'done' | 'open' | 'locked') {
  const queryClient = new QueryClient()
  queryClient.setQueryData(['modules'], MODULES)
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <PertemuanStepper current={1} basePath="/modul" statusOf={statusOf} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('PertemuanStepper', () => {
  it('renders one button per module (n = jumlah modul)', () => {
    const html = renderStepper()
    expect((html.match(/<button/g) ?? []).length).toBe(MODULES.length)
    expect(html).toContain('P1')
    expect(html).toContain('P2')
    expect(html).toContain('P3')
  })

  it('marks a locked pertemuan as disabled', () => {
    const html = renderStepper((id) => (id === 2 ? 'locked' : 'open'))
    // React renders boolean `disabled` as a bare attribute in SSR markup.
    expect(html).toMatch(/P2<\/button>/)
    const buttons = html.split('<button').slice(1)
    const p2 = buttons.find((b) => b.includes('>P2<'))
    expect(p2).toContain('disabled=""')
  })
})
