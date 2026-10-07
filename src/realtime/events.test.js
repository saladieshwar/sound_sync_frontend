import { describe, expect, it } from 'vitest'
import { positionAtServerTs, roomErrorMessage, timelinePosition } from './events'

describe('room sync helpers', () => {
  it('advances the room timeline by server time only while playing', () => {
    const timeline = { positionSeconds: 40, playing: true, serverTs: 10_000 }
    expect(timelinePosition(timeline, 10_250)).toBeCloseTo(40.25)
    expect(timelinePosition({ ...timeline, playing: false }, 10_250)).toBe(40)
    expect(timelinePosition(timeline, 9_000)).toBe(40) // never moves backwards
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
