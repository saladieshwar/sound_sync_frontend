import { afterEach, describe, expect, it, vi } from 'vitest'
import { createServerClock } from './serverClock'

afterEach(() => vi.useRealTimers())

describe('createServerClock', () => {
  it('uses the local clock until the first sample', () => {
    vi.useFakeTimers()
    vi.setSystemTime(5_000)
    const clock = createServerClock()
    expect(clock.offset()).toBe(0)
    expect(clock.now()).toBe(5_000)
  })

  it('estimates the offset from the fastest round trip', () => {
    vi.useFakeTimers()
    vi.setSystemTime(20_000)
    const clock = createServerClock()
    // Server is 1500 ms ahead. Slow sample: 400 ms RTT, reply sent late on the way back.
    clock.addSample(10_000, 11_700, 10_400)
    // Fast sample: 20 ms RTT, symmetric.
    clock.addSample(11_000, 12_510, 11_020)
    expect(clock.offset()).toBe(1_500)
    expect(clock.now()).toBe(21_500)
  })

  it('ignores invalid samples', () => {
    const clock = createServerClock()
    clock.addSample(Number.NaN, 1_000, 2_000)
    clock.addSample(2_000, 1_000, 1_000) // received before it was sent
    expect(clock.offset()).toBe(0)
  })
})
