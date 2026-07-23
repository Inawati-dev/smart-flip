import { describe, it, expect } from 'vitest'
import { moduleIdToPath } from './progress'

describe('moduleIdToPath', () => {
  it('formats the module id into the legacy books/ path convention', () => {
    expect(moduleIdToPath(1)).toBe('books/modul-01.pdf')
    expect(moduleIdToPath(9)).toBe('books/modul-09.pdf')
  })
})
