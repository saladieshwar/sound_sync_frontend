import { useCallback, useEffect, useRef, useState } from 'react'
import { WS_BASE_URL } from '../config'

const RECONNECT_DELAY_MS = 2000

/**
 * Connects to WS /rooms/{roomId}/ws after the REST join has succeeded.
 * `onMessage` receives parsed server messages: { type, payload, sender_user_id, server_ts }.
 */
export function useRoomSocket({ roomId, token, enabled, onMessage }) {
  const socketRef = useRef(null)
  const onMessageRef = useRef(onMessage)
  const [status, setStatus] = useState('idle')

  useEffect(() => {
    onMessageRef.current = onMessage
  }, [onMessage])

  useEffect(() => {
    if (!enabled || !roomId || !token) return undefined
    let closedByUs = false
    let retryTimer

    const connect = () => {
      setStatus('connecting')
      const ws = new WebSocket(`${WS_BASE_URL}/rooms/${roomId}/ws?token=${token}`)
      socketRef.current = ws
      ws.onopen = () => setStatus('open')
      ws.onmessage = (e) => onMessageRef.current?.(JSON.parse(e.data))
      ws.onclose = (e) => {
        setStatus('closed')
        // 1008 = policy violation (not a participant / room closed): don't retry
        if (!closedByUs && e.code !== 1008) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    connect()
    return () => {
      closedByUs = true
      clearTimeout(retryTimer)
      socketRef.current?.close()
    }
  }, [roomId, token, enabled])

  const send = useCallback((type, payload = {}) => {
    const ws = socketRef.current
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type, payload }))
  }, [])

  return { status, send }
}
