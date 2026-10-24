// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { MenuAksi, ItemMenu } from './KartuTopik'

afterEach(cleanup)

function Dua() {
  return (
    <>
      <MenuAksi tombol="⋯" ariaLabel="Aksi lain untuk A" kelasTombol="btn">
        <ItemMenu onPilih={() => {}}>Pratinjau</ItemMenu>
        <ItemMenu onPilih={() => {}}>Ubah topik</ItemMenu>
      </MenuAksi>
      <MenuAksi tombol="⋯" ariaLabel="Aksi lain untuk B" kelasTombol="btn">
        <ItemMenu onPilih={() => {}}>Hapus topik</ItemMenu>
      </MenuAksi>
    </>
  )
}

describe('MenuAksi dengan papan ketik', () => {
  it('Enter membuka dan memfokus item pertama, panah berpindah, Escape kembali ke tombol', () => {
    render(<Dua />)
    const pemicu = screen.getByRole('button', { name: 'Aksi lain untuk A' })
    fireEvent.click(pemicu, { detail: 0 })
    const item = screen.getAllByRole('menuitem')
    expect(document.activeElement).toBe(item[0])
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item[1])
    fireEvent.keyDown(document, { key: 'ArrowDown' })
    expect(document.activeElement).toBe(item[0])
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('menu')).toBeNull()
    expect(document.activeElement).toBe(pemicu)
  })

  it('dibuka mouse, panah atas dari tombol ke item terakhir', () => {
    render(<Dua />)
    const pemicu = screen.getByRole('button', { name: 'Aksi lain untuk A' })
    pemicu.focus()
    fireEvent.click(pemicu, { detail: 1 })
    fireEvent.keyDown(document, { key: 'ArrowUp' })
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'Ubah topik' }))
  })

  it('fokus pindah ke menu kartu lain menutup menu pertama', () => {
    render(<Dua />)
    fireEvent.click(screen.getByRole('button', { name: 'Aksi lain untuk A' }), { detail: 0 })
    const b = screen.getByRole('button', { name: 'Aksi lain untuk B' })
    b.focus()
    fireEvent.click(b, { detail: 0 })
    expect(screen.getAllByRole('menu')).toHaveLength(1)
    expect(screen.getByRole('menuitem', { name: 'Hapus topik' })).toBeTruthy()
  })
})
