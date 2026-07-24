import { describe, it, expect } from 'vitest'
import { designTokens } from './design-tokens'

describe('designTokens', () => {
  it('matches the existing legacy/style.css :root values', () => {
    expect(designTokens.cream).toBe('#F5F2E9')
    expect(designTokens.sage).toBe('#8FA287')
    expect(designTokens.terra).toBe('#D4A373')
    expect(designTokens.brown).toBe('#3E362E')
  })
})
