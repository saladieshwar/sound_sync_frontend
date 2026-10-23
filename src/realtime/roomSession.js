/**
 * Tracks the Musical Room the user is still in (even after navigating to Search/Home)
 * so a controller can pick a song from search and have it play for everyone in the room.
 * Cleared only on Leave / room closed — not when leaving the room page.
 */
let session = null

export function getRoomSession() {
  return session
}

export function setRoomSession(next) {
  session = next
}

export function clearRoomSession() {
  session = null
}

/**
 * If this user controls an active room, navigate there to play `song` for everyone.
 * Otherwise play locally. Returns true when the room handled the request.
 */
export function playSongOrInRoom({ song, queue, playSong, navigate }) {
  const active = getRoomSession()
  if (active?.isController && active.roomId) {
    navigate(`/room/${active.roomId}`, { state: { playSongId: song.id } })
    return true
  }
  playSong(song, queue ?? [song])
  return false
}
