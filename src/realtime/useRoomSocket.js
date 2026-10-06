import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE_URL } from '../config'

export const RECONNECT_DELAY_MS = 2000

// 1000 = server closed on purpose (you left / room closed); 1008 = not allowed (not joined,
// bad token, room closed). Anything else (network drop, server restart) is retried.
const FINAL_CLOSE_CODES = new Set([1000, 1008])

/**
 * Connects to WS /rooms/{roomId}/ws after the REST join has succeeded.
 * `onMessage` receives parsed server messages: { type, payload, sender_user_id, server_ts }.
 * `onClosed` is called with the close code when the server ends the session for good.
 * status: idle | connecting | open | reconnecting | closed
 */
export function useRoomSocket({ roomId, token, enabled, onMessage, onClosed }) {
  const socketRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const onClosedRef = useRef(onClosed)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    onMessageRef.current = onMessage
    onClosedRef.current = onClosed
  }, [onMessage, onClosed])

  useEffect(() => {
    if (!enabled || !roomId || !token) return undefined
    let closedByUs = false
    let retryTimer

    const connect = () => {
      const ws = new WebSocket(
        `${WS_BASE_URL}/rooms/${encodeURIComponent(roomId)}/ws?token=${encodeURIComponent(token)}`,
      )
      socketRef.current = ws
      ws.onopen = () => setStatus('open')
      ws.onmessage = (e) => {
        let message
        try {
          message = JSON.parse(e.data)
        } catch {
          return
        }
        onMessageRef.current?.(message)
      }
      ws.onclose = (e) => {
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
