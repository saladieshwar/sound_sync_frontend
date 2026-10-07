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

  it.each([
    // [network, one-way base ms, one-way jitter ms, max error ms] - see backend/docs/sync_tuning.md
    ['wifi', 10, 5, 5],
    ['4g', 30, 15, 15],
    ['poor', 75, 40, 40],
  ])(
    'keeps two devices within tolerance under %s jitter with uneven up/down delays',
    (_, base, jitter, maxError) => {
      // Deterministic pseudo-random delays so the test is stable.
      let seed = 42
      const rand = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31) * 2 - 1
      const estimate = (skew) => {
        const clock = createServerClock()
        let realNow = 1_000_000
        for (let i = 0; i < 5; i += 1) {
          const up = base + jitter * rand()
          const down = base + jitter * rand()
          const sentAt = realNow + skew
          const serverTs = realNow + up
          realNow += up + down
          clock.addSample(sentAt, serverTs, realNow + skew)
          realNow += 200
        }
        return clock.offset() + skew // 0 means this device knows server time exactly
      }

      for (let trial = 0; trial < 20; trial += 1) {
        const a = estimate(2_400)
        const b = estimate(-1_700)
        expect(Math.abs(a)).toBeLessThanOrEqual(maxError)
        expect(Math.abs(a - b)).toBeLessThanOrEqual(2 * maxError)
      }
    },
  )

  it('ignores invalid samples', () => {
    const clock = createServerClock()
    clock.addSample(Number.NaN, 1_000, 2_000)
    clock.addSample(2_000, 1_000, 1_000) // received before it was sent
    expect(clock.offset()).toBe(0)
  })
})
