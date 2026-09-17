// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { PillGroup } from './PillGroup'

afterEach(cleanup)

const OPTIONS = [
  { value: 'pre', label: 'Pre-test' },
  { value: 'post', label: 'Post-test' },
]

function ControlledPillGroup() {
  const [value, setValue] = useState('pre')
  return <PillGroup options={OPTIONS} value={value} onChange={setValue} ariaLabel="Filter jenis" />
}

describe('PillGroup', () => {
  it('marks the current value as pressed and the rest as not', () => {
    render(<ControlledPillGroup />)
    expect(screen.getByText('Pre-test').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Post-test').getAttribute('aria-pressed')).toBe('false')
  })

  // Antrean 16 Sep 2026: pil tidak aktif diberi latar bg-ivory supaya tidak
  // menyatu dengan latar landing/halaman di belakangnya.
  it('gives an inactive pill a bg-ivory background', () => {
    render(<ControlledPillGroup />)
    expect(screen.getByText('Post-test').className).toContain('bg-ivory')
  })

  // Antrean #102 opsi A: varian tab bergaris bawah untuk tingkat 1 (Bank soal).
  it('variant tab renders a tablist with the active tab selected', () => {
    render(<PillGroup variant="tab" options={OPTIONS} value="post" onChange={() => {}} ariaLabel="Tab" />)
    expect(screen.getByRole('tablist').className).toContain('border-b')
    expect(screen.getByText('Post-test').getAttribute('aria-selected')).toBe('true')
    expect(screen.getByText('Pre-test').getAttribute('aria-selected')).toBe('false')
  })

  it('clicking a pill switches the active state to it', () => {
    render(<ControlledPillGroup />)
    fireEvent.click(screen.getByText('Post-test'))
    expect(screen.getByText('Post-test').getAttribute('aria-pressed')).toBe('true')
    expect(screen.getByText('Pre-test').getAttribute('aria-pressed')).toBe('false')
  })

  // Antrean 16 Sep 2026: badge notifikasi di pil tab (Dashboard dosen).
  it('shows a badge when given', () => {
    render(<PillGroup options={[{ value: 'a', label: 'Tab A', badge: 3 }]} value="a" onChange={() => {}} />)
    expect(screen.getByText('3')).toBeTruthy()
  })

  it('caps a badge above 99 at "99+"', () => {
    render(<PillGroup options={[{ value: 'a', label: 'Tab A', badge: 150 }]} value="a" onChange={() => {}} />)
    expect(screen.getByText('99+')).toBeTruthy()
  })

  it('hides the badge when it is 0', () => {
    render(<PillGroup options={[{ value: 'a', label: 'Tab A', badge: 0 }]} value="a" onChange={() => {}} />)
    expect(screen.queryByText('0')).toBeNull()
  })
})
