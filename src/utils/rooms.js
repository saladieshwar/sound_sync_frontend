const ROOM_ID = /^[A-Z0-9]{8}$/

/**
 * Accepts either a raw Room ID ("ab12cd34") or a join link ("http://host:5173/room/AB12CD34?x")
 * and returns the upper-case Room ID, or null if the input contains neither.
 */
export function extractRoomId(value) {
  const text = value.trim()
  const fromLink = text.match(/\/room\/([A-Za-z0-9]+)/)
  const candidate = (fromLink ? fromLink[1] : text).toUpperCase()
  return ROOM_ID.test(candidate) ? candidate : null
}
