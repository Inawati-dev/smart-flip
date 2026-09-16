// @vitest-environment jsdom
import { useState } from 'react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { Select, type SelectOption } from './Select'

afterEach(cleanup)

const OPTIONS: SelectOption[] = [
  { value: 'aktif', label: 'Aktif' },
  { value: 'draf', label: 'Draf' },
  { value: 'terkunci', label: 'Terkunci' },
]

// Mirrors how every page in src/pages actually uses <Select> — controlled
// value/onChange owned by the parent, same as the old <select>'s
// value/onChange(e.target.value) pattern it replaces.
function ControlledSelect({ initial = 'aktif', onChange }: { initial?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <Select
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange?.(v)
      }}
      options={OPTIONS}
    />
  )
}

describe('Select', () => {
  it('renders a closed trigger exposing role=combobox with the selected option label, and no listbox yet', () => {
    render(<ControlledSelect />)
    const trigger = screen.getByRole('combobox')
    expect(trigger.textContent).toContain('Aktif')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows placeholder text when the current value matches no option', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} placeholder="Pilih status" />)
    expect(screen.getByRole('combobox').textContent).toContain('Pilih status')
  })

  it('opens the listbox on click, listing every option with role=option', () => {
    render(<ControlledSelect />)
    fireEvent.click(screen.getByRole('combobox'))

    expect(screen.getByRole('listbox')).toBeTruthy()
    const options = screen.getAllByRole('option')
    expect(options.map((o) => o.textContent)).toEqual(['Aktif', 'Draf', 'Terkunci'])
  })

  it('clicking an option calls onChange with its value and closes the popup', () => {
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)
    fireEvent.click(screen.getByRole('combobox'))
    // getByText saja bentrok sejak #46: label "Terkunci" sekarang juga ada di
    // span pengukur lebar tersembunyi di dalam trigger (lihat tes di bawah),
    // jadi query dibatasi ke listbox supaya cuma opsi yang diklik.
    fireEvent.click(within(screen.getByRole('listbox')).getByText('Terkunci'))

    expect(onChange).toHaveBeenCalledWith('terkunci')
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(screen.getByRole('combobox').textContent).toContain('Terkunci')
  })

  it('clicking outside the trigger/listbox closes it without calling onChange', () => {
    const onChange = vi.fn()
    render(
      <div>
        <ControlledSelect onChange={onChange} />
        <button>outside</button>
      </div>,
    )
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.getByRole('listbox')).toBeTruthy()

    fireEvent.mouseDown(screen.getByText('outside'))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keyboard: ArrowDown moves the highlight and Enter commits the highlighted option', () => {
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)
    const trigger = screen.getByRole('combobox')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // opens, highlight starts at current value (aktif, index 0)
    fireEvent.keyDown(trigger, { key: 'ArrowDown' }) // highlight -> draf (index 1)
    fireEvent.keyDown(trigger, { key: 'Enter' })

    expect(onChange).toHaveBeenCalledWith('draf')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('keyboard: Escape closes the popup without changing the value', () => {
    const onChange = vi.fn()
    render(<ControlledSelect onChange={onChange} />)
    const trigger = screen.getByRole('combobox')

    fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    expect(screen.getByRole('listbox')).toBeTruthy()

    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('disabled trigger does not open the popup on click', () => {
    render(<Select value="aktif" onChange={() => {}} options={OPTIONS} disabled />)
    fireEvent.click(screen.getByRole('combobox'))
    expect(screen.queryByRole('listbox')).toBeNull()
    expect((screen.getByRole('combobox') as HTMLButtonElement).disabled).toBe(true)
  })

  it('renders an empty closed state (no crash) when value is empty and no placeholder is given', () => {
    const html = renderToStaticMarkup(<Select value="" onChange={() => {}} options={OPTIONS} />)
    expect(html).toContain('role="combobox"')
  })

  it('renders the optional label above the trigger', () => {
    render(<ControlledSelect />)
    // no label by default
    expect(screen.queryByText('Status')).toBeNull()
    cleanup()
    render(<Select value="aktif" onChange={() => {}} options={OPTIONS} label="Status" />)
    expect(screen.getByText('Status')).toBeTruthy()
  })

  it('size="sm" memasang kelas select-trigger-sm (36 px di layar sm ke atas, 44 px di telepon lewat CSS)', () => {
    render(<Select value="aktif" onChange={() => {}} options={OPTIONS} size="sm" />)
    const trigger = screen.getByRole('combobox') as HTMLButtonElement
    expect(trigger.className).toContain('select-trigger-sm')
    expect(trigger.style.minHeight).toBe('')
  })

  // Antrean #46 (16 Sep 2026): dropdown Tahun berubah lebar tiap kali nilai
  // berganti ("Semua tahun" -> "2027") karena tombol cuma selebar label yang
  // sedang tampil. Fix-nya span pengukur tersembunyi berisi SEMUA label
  // opsi (satu per baris) di dalam trigger, supaya lebar shrink-to-fit
  // tombol dihitung dari opsi terpanjang, bukan cuma yang aktif.
  it('renders a hidden width-measurer holding every option label, not just the selected one', () => {
    render(<ControlledSelect initial="draf" />)
    const trigger = screen.getByRole('combobox')
    const measurer = trigger.querySelector('[aria-hidden="true"]')
    expect(measurer).toBeTruthy()
    expect(measurer!.textContent).toBe('AktifDrafTerkunci')
    // Bukan role=option (aria-hidden menyembunyikannya dari a11y tree) —
    // getAllByRole('option') di tes lain tetap cuma menghitung listbox.
    expect(measurer!.getAttribute('aria-hidden')).toBe('true')
  })

  it('width-measurer also includes the placeholder when one is given', () => {
    render(<Select value="" onChange={() => {}} options={OPTIONS} placeholder="Pilih status" />)
    const trigger = screen.getByRole('combobox')
    const measurer = trigger.querySelector('[aria-hidden="true"]')
    expect(measurer!.textContent).toContain('Pilih status')
  })
})
