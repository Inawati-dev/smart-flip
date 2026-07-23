import { describe, it, expect } from 'vitest'
import { formatAttemptDate } from './quizAttempts'

describe('formatAttemptDate', () => {
  it('formats an ISO date string into id-ID short date format', () => {
    // 2026-03-05 -> "05 Mar 2026" (id-ID locale, 2-digit day, short month, numeric year)
    const result = formatAttemptDate('2026-03-05T10:00:00.000Z')
    expect(result).toMatch(/^\d{2} \w{3} 2026$/)
  })
})
