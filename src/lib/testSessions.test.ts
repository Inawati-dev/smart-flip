// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest'
import { generateCode, verifyTestCode } from './testSessions'

const supabaseMock = { configured: false, rpcError: null as { code?: string; message?: string } | null }

vi.mock('./supabase', () => ({
  supabase: {
    rpc: (_fn: string, _args: unknown) =>
      supabaseMock.rpcError
        ? Promise.resolve({ data: null, error: supabaseMock.rpcError })
        : Promise.resolve({ data: [], error: null }),
  },
  get isSupabaseConfigured() {
    return supabaseMock.configured
  },
}))

describe('generateCode', () => {
  it('is always 6 chars and never contains 0/O/1/I', () => {
    for (let i = 0; i < 100; i++) {
      const code = generateCode()
      expect(code).toHaveLength(6)
      expect(code).not.toMatch(/[0O1I]/)
    }
  })
})

describe('verifyTestCode', () => {
  it('returns null when the RPC does not exist yet (42883 - migration_v18 not run)', async () => {
    supabaseMock.configured = true
    supabaseMock.rpcError = { code: '42883', message: 'function verify_test_code does not exist' }
    const result = await verifyTestCode('ABC123')
    expect(result).toBeNull()
  })
})
