import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE_URL } from '../config'
import { RoomEvent } from './events'

export const RECONNECT_DELAY_MS = 2000
export const TIME_SYNC_SAMPLES = 5
export const TIME_SYNC_SPACING_MS = 200
export const TIME_SYNC_REFRESH_MS = 30_000

// 1000 = server closed on purpose (you left / room closed); 1008 = not allowed (not joined,
// bad token, room closed). Anything else (network drop, server restart) is retried.
const FINAL_CLOSE_CODES = new Set([1000, 1008])

/**
 * Connects to WS /rooms/{roomId}/ws after the REST join has succeeded.
 * `onMessage` receives parsed server messages: { type, payload, sender_user_id, server_ts }.
 * `onClosed` is called with the close code when the server ends the session for good.
 * `clock` (from createServerClock) is fed with `time_sync` round trips: a burst on every
 * connect, then one every 30 s. Those replies are not passed to `onMessage`.
 * status: idle | connecting | open | reconnecting | closed
 */
export function useRoomSocket({ roomId, token, enabled, onMessage, onClosed, clock }) {
  const socketRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const onClosedRef = useRef(onClosed)
  const clockRef = useRef(clock)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    onMessageRef.current = onMessage
    onClosedRef.current = onClosed
    clockRef.current = clock
  }, [onMessage, onClosed, clock])

  useEffect(() => {
    if (!enabled || !roomId || !token) return undefined
    let closedByUs = false
    let retryTimer
    let syncTimers = []

    const clearSyncTimers = () => {
      syncTimers.forEach((t) => clearTimeout(t))
      syncTimers = []
    }

    const sendTimeSync = (ws) => {
      if (ws.readyState !== WebSocket.OPEN) return
      ws.send(JSON.stringify({ type: RoomEvent.TIME_SYNC, payload: { client_ts: Date.now() } }))
    }

    const connect = () => {
      const ws = new WebSocket(
        `${WS_BASE_URL}/rooms/${encodeURIComponent(roomId)}/ws?token=${encodeURIComponent(token)}`,
      )
      socketRef.current = ws
      ws.onopen = () => {
        setStatus('open')
        for (let i = 0; i < TIME_SYNC_SAMPLES; i += 1) {
          syncTimers.push(setTimeout(() => sendTimeSync(ws), i * TIME_SYNC_SPACING_MS))
        }
        const refresh = () => {
          sendTimeSync(ws)
          syncTimers.push(setTimeout(refresh, TIME_SYNC_REFRESH_MS))
        }
        syncTimers.push(setTimeout(refresh, TIME_SYNC_REFRESH_MS))
      }
      ws.onmessage = (e) => {
        let message
        try {
          message = JSON.parse(e.data)
        } catch {
          return
        }
        if (message.type === RoomEvent.TIME_SYNC) {
          clockRef.current?.addSample(message.payload?.client_ts, message.server_ts)
          return
        }
        onMessageRef.current?.(message)
      }
      ws.onclose = (e) => {
        clearSyncTimers()
        if (closedByUs) return
        if (FINAL_CLOSE_CODES.has(e.code)) {
          setStatus('closed')
          onClosedRef.current?.(e.code)
          return
        }
        setStatus('reconnecting')
        retryTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()
    return () => {
      closedByUs = true
      clearTimeout(retryTimer)
      clearSyncTimers()
      socketRef.current?.close()
      socketRef.current = null
    }
  }, [roomId, token, enabled])

  const send = useCallback((type, payload = {}) => {
    const ws = socketRef.current
    if (ws?.readyState !== WebSocket.OPEN) return false
    ws.send(JSON.stringify({ type, payload }))
    return true
  }, [])

  return { status: enabled ? status : 'idle', send }
}
