import { describe, it, expect } from 'vitest'
import { normalizeModuleRow } from './modules'

describe('normalizeModuleRow', () => {
  it('maps pdf_path to path and defaults missing demo-only fields', () => {
    const raw = {
      id: 1, order_num: 1, title: 'Dasar & Konsep R&D',
      description: 'desc', video_url: null, pdf_path: 'books/modul-01.pdf',
      is_active: true,
    }
    const result = normalizeModuleRow(raw)
    expect(result.path).toBe('books/modul-01.pdf')
    expect(result.color).toBe('var(--sage)')
    expect(result.sub).toBe('')
    expect(result.capaian).toEqual([])
    expect(result.materi).toEqual([])
    expect(result.kuis).toEqual([])
    expect(result.jurnal).toEqual([])
    expect(result.studiKasus).toEqual([])
  })

  it('keeps demo-fixture fields untouched when they are already present', () => {
    const demoShaped = {
      id: 1, order_num: 1, title: 'X', description: 'd', pdf_path: null,
      path: 'books/modul-01.pdf', color: '#8FA287', sub: 'Konsep dasar',
      capaian: ['a'], materi: [{ sesi: 1, topik: 't' }],
    }
    const result = normalizeModuleRow(demoShaped)
    expect(result.path).toBe('books/modul-01.pdf')
    expect(result.color).toBe('#8FA287')
    expect(result.sub).toBe('Konsep dasar')
    expect(result.capaian).toEqual(['a'])
  })
})
