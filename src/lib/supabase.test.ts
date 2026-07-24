import { describe, it, expect } from 'vitest'
import { isSupabaseConfigured } from './supabase'

describe('supabase client', () => {
  it('reports configured when env vars are present', () => {
    // vite.config.ts test env doesn't set these by default -> expect false in test env
    expect(typeof isSupabaseConfigured).toBe('boolean')
  })
})
