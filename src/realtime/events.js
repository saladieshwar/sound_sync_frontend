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

/** Position the controller is at "now", compensating for network latency. */
export const reconcilePosition = (positionSeconds, serverTs, playing) =>
  playing ? positionSeconds + Math.max(0, Date.now() - serverTs) / 1000 : positionSeconds
