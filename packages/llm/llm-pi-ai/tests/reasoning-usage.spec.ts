import { describe, expect, it } from 'vitest'
import type { Usage } from '@earendil-works/pi-ai'
import { mapUsage } from '../src/stream.ts'

function usage(overrides: Partial<Usage> = {}): Usage {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    ...overrides,
  }
}

describe('mapUsage reasoningTokens', () => {
  it('omits reasoningTokens when pi-ai reports no reasoning breakdown', () => {
    expect(mapUsage(usage({ input: 10, output: 5 }))).toEqual({
      inputTokens: 10,
      outputTokens: 5,
    })
  })

  it('maps a zero reasoning count to reasoningTokens: 0', () => {
    expect(mapUsage(usage({ input: 10, output: 5, reasoning: 0 }))).toEqual({
      inputTokens: 10,
      outputTokens: 5,
      reasoningTokens: 0,
    })
  })

  it('passes a positive reasoning count through unchanged', () => {
    expect(mapUsage(usage({ input: 10, output: 123, reasoning: 123 }))).toEqual({
      inputTokens: 10,
      outputTokens: 123,
      reasoningTokens: 123,
    })
  })

  it('keeps reasoning out of outputTokens (no double counting)', () => {
    const mapped = mapUsage(usage({ input: 10, output: 200, reasoning: 123 }))
    // reasoning is a subset of output in pi-ai's accounting; the harness must
    // surface it as a separate token-meter field without folding it into outputTokens.
    expect(mapped.outputTokens).toBe(200)
    expect(mapped.reasoningTokens).toBe(123)
  })
})
