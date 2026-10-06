import { afterEach, describe, expect, it, vi } from 'vitest'
import { positionAtServerTs, reconcilePosition, roomErrorMessage } from './events'

afterEach(() => vi.useRealTimers())

describe('room sync helpers', () => {
  it('adds network latency to the position only while playing', () => {
    vi.useFakeTimers()
    vi.setSystemTime(10_250)
    expect(reconcilePosition(40, 10_000, true)).toBeCloseTo(40.25)
    expect(reconcilePosition(40, 10_000, false)).toBe(40)
    expect(reconcilePosition(40, 11_000, true)).toBe(40) // clock skew never moves backwards
  })

  it('advances a room snapshot by the time it has been playing on the server', () => {
    const updatedAt = Date.parse('2026-10-03T10:00:00Z')
    const room = { position_seconds: 30, is_playing: true, state_updated_at: '2026-10-03T10:00:00Z' }
    expect(positionAtServerTs(room, updatedAt + 12_000)).toBe(42)
    expect(positionAtServerTs({ ...room, is_playing: false }, updatedAt + 12_000)).toBe(30)
  })

  it('maps error codes to friendly text', () => {
    expect(roomErrorMessage('NOT_ROOM_CONTROLLER')).toBe(
      'Only the current controller can change playback.',
    )
    expect(roomErrorMessage('SOMETHING_NEW')).toMatch(/Something went wrong/)
  })
})
