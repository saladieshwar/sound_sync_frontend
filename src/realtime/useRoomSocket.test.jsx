import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MockWebSocket } from '../testUtils'
import { RECONNECT_DELAY_MS, useRoomSocket } from './useRoomSocket'

const setup = (props = {}) => {
  const onMessage = vi.fn()
  const onClosed = vi.fn()
  const hook = renderHook((p) => useRoomSocket(p), {
    initialProps: { roomId: 'AB12CD34', token: 'tok en', enabled: true, onMessage, onClosed, ...props },
  })
  return { ...hook, onMessage, onClosed }
}

beforeEach(() => {
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useRoomSocket', () => {
  it('connects to the room socket with the JWT and reports when it is live', () => {
    const { result } = setup()
    const ws = MockWebSocket.latest()
    expect(ws.url).toBe('ws://localhost:8000/rooms/AB12CD34/ws?token=tok%20en')
    expect(result.current.status).toBe('connecting')

    act(() => ws.open())
    expect(result.current.status).toBe('open')
  })

  it('does not connect until enabled (REST join first)', () => {
    const { result, rerender, onMessage } = setup({ enabled: false })
    expect(MockWebSocket.instances).toHaveLength(0)
    expect(result.current.status).toBe('idle')

    rerender({ roomId: 'AB12CD34', token: 't', enabled: true, onMessage })
    expect(MockWebSocket.instances).toHaveLength(1)
  })

  it('passes parsed server messages on and ignores malformed frames', () => {
    const { onMessage } = setup()
    const ws = MockWebSocket.latest()
    act(() => {
      ws.open()
      ws.receiveRaw('not json')
      ws.receive('play', { song_id: 1, position_seconds: 3, is_playing: true }, { serverTs: 5 })
    })
    expect(onMessage).toHaveBeenCalledTimes(1)
    expect(onMessage).toHaveBeenCalledWith({
      type: 'play',
      payload: { song_id: 1, position_seconds: 3, is_playing: true },
      sender_user_id: null,
      server_ts: 5,
    })
  })

  it('sends contract-shaped messages only while open', () => {
    const { result } = setup()
    const ws = MockWebSocket.latest()
    expect(result.current.send('play', { position_seconds: 1 })).toBe(false)
    expect(ws.sent).toEqual([])

    act(() => ws.open())
    expect(result.current.send('seek', { position_seconds: 42 })).toBe(true)
    expect(ws.sent).toEqual([{ type: 'seek', payload: { position_seconds: 42 } }])
  })

  it('reconnects after a network drop', () => {
    vi.useFakeTimers()
    const { result } = setup()
    act(() => MockWebSocket.latest().open())

    act(() => MockWebSocket.latest().serverClose(1006))
    expect(result.current.status).toBe('reconnecting')
    expect(MockWebSocket.instances).toHaveLength(1)

    act(() => vi.advanceTimersByTime(RECONNECT_DELAY_MS))
    expect(MockWebSocket.instances).toHaveLength(2)
    act(() => MockWebSocket.latest().open())
    expect(result.current.status).toBe('open')
  })

  it.each([1000, 1008])('does not retry when the server closes with %i', (code) => {
    vi.useFakeTimers()
    const { result, onClosed } = setup()
    act(() => MockWebSocket.latest().open())

    act(() => MockWebSocket.latest().serverClose(code))
    act(() => vi.advanceTimersByTime(RECONNECT_DELAY_MS * 3))
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(result.current.status).toBe('closed')
    expect(onClosed).toHaveBeenCalledWith(code)
  })

  it('closes the socket on unmount without reconnecting', () => {
    vi.useFakeTimers()
    const { unmount, onClosed } = setup()
    const ws = MockWebSocket.latest()
    act(() => ws.open())

    unmount()
    expect(ws.close).toHaveBeenCalled()
    ws.serverClose(1006)
    vi.advanceTimersByTime(RECONNECT_DELAY_MS * 3)
    expect(MockWebSocket.instances).toHaveLength(1)
    expect(onClosed).not.toHaveBeenCalled()
  })
})
