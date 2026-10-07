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
  TIME_SYNC: 'time_sync',
})

export const PLAYBACK_EVENTS = new Set([
  RoomEvent.PLAY,
  RoomEvent.PAUSE,
  RoomEvent.SEEK,
  RoomEvent.SONG_CHANGE,
])

/** Acceptance limit: every client must stay within this many seconds of the room position. */
export const DRIFT_TOLERANCE_SECONDS = 0.5

// Drift correction while a room song plays (PlayerContext). The playback rate is never changed:
// browsers time-stretch audio played at any rate other than 1, which sounds choppy on phones.
// Instead, after every play / seek / join the player "settles": it measures its drift (median of
// DRIFT_SAMPLES readings, DRIFT_CHECK_MS apart) once audio has run for SETTLE_MS, and if it is
// more than IN_SYNC_SECONDS off, makes one small jump - up to SETTLE_ATTEMPTS times. Each jump
// learns how late this device's audio resumes after a seek (its "seek lead") so the next lands
// on time. Once settled, the audio is left alone unless it drifts more than RESYNC_SECONDS.
export const DRIFT_CHECK_MS = 250
export const DRIFT_SAMPLES = 4
export const SETTLE_MS = 750
export const SETTLE_ATTEMPTS = 3
export const IN_SYNC_SECONDS = 0.04
export const RESYNC_SECONDS = 0.15
export const MAX_SEEK_LEAD_SECONDS = 0.5

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

/**
 * Where the room is on its timeline at server time `serverNowMs`. A timeline is the room position
 * `positionSeconds` at server time `serverTs`, advancing in real time while `playing`.
 */
export const timelinePosition = ({ positionSeconds, playing, serverTs }, serverNowMs) =>
  playing ? positionSeconds + Math.max(0, serverNowMs - serverTs) / 1000 : positionSeconds

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
