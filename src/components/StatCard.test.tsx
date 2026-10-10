// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { StatCard, type StatCardProps } from './StatCard'

afterEach(cleanup)

function renderKartu(props: Partial<StatCardProps>) {
  return render(
    <MemoryRouter>
      <StatCard bar="var(--sage)" val="7" label="Topik selesai" {...props} />
    </MemoryRouter>,
  )
}

describe('StatCard', () => {
  it('dengan `to` merender tautan ber-href benar dan aria-label', () => {
    renderKartu({ to: '/modul' })
    const a = screen.getByRole('link', { name: 'Topik selesai: 7' })
    expect(a.getAttribute('href')).toBe('/modul')
  })

  it('dengan `onClick` merender tombol', () => {
    renderKartu({ onClick: () => {} })
    expect(screen.getByRole('button', { name: 'Topik selesai: 7' })).toBeTruthy()
  })

  it('tanpa `to`/`onClick` tidak merender tautan maupun tombol', () => {
    renderKartu({})
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('Topik selesai')).toBeTruthy()
  })
})
