// Mirrors backend/app/realtime/events.py — see backend/docs/websocket_contract.md
export const RoomEvent = Object.freeze({
  PLAY: 'play',
  PAUSE: 'pause',
  SEEK: 'seek',
  SONG_CHANGE: 'song_change',
  ACCESS_TRANSFER: 'access_transfer',
  USER_JOINED: 'user_joined',
  USER_LEFT: 'user_left',
  ROOM_STATE: 'room_state',
  ROOM_CLOSED: 'room_closed',
  ERROR: 'error',
})

export const PLAYBACK_EVENTS = new Set([
  RoomEvent.PLAY,
  RoomEvent.PAUSE,
  RoomEvent.SEEK,
  RoomEvent.SONG_CHANGE,
])

/** Clients within this many seconds of the room position are considered in sync. */
export const DRIFT_TOLERANCE_SECONDS = 0.5

/** User-facing text for `error` event codes. */
export const ROOM_ERROR_MESSAGES = Object.freeze({
  NOT_ROOM_CONTROLLER: 'Only the current controller can change playback.',
  NO_CURRENT_SONG: 'Pick a song for the room first.',
  SONG_NOT_FOUND: 'That song is no longer available.',
  ROOM_CLOSED: 'This room has been closed.',
  INVALID_MESSAGE: 'Something went wrong sending that action. Please try again.',
  INVALID_PAYLOAD: 'Something went wrong sending that action. Please try again.',
  EVENT_NOT_ALLOWED: 'That action is not allowed in a room.',
})

export const roomErrorMessage = (code) =>
  ROOM_ERROR_MESSAGES[code] ?? 'Something went wrong in the room. Please try again.'

/** Position the controller is at "now", compensating for network latency. */
export const reconcilePosition = (positionSeconds, serverTs, playing) =>
  playing ? positionSeconds + Math.max(0, Date.now() - serverTs) / 1000 : positionSeconds

/**
 * Room position at the moment `room_state` was sent: the stored position plus the time the room
 * has been playing since `state_updated_at` (both measured on the server clock).
 */
export const positionAtServerTs = (room, serverTs) => {
  if (!room.is_playing) return room.position_seconds
  const updatedAt = Date.parse(room.state_updated_at)
  const elapsed = Number.isFinite(updatedAt) ? Math.max(0, serverTs - updatedAt) / 1000 : 0
  return room.position_seconds + elapsed
}
