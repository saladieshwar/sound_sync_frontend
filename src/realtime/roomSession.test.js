import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearRoomSession,
  getRoomSession,
  playSongOrInRoom,
  setRoomSession,
} from './roomSession'

afterEach(() => clearRoomSession())

describe('roomSession', () => {
  it('routes a controller play into the active room', () => {
    setRoomSession({ roomId: 'AB12CD34', isController: true })
    const playSong = vi.fn()
    const navigate = vi.fn()
    const song = { id: 7, title: 'Grey Rain' }

    expect(playSongOrInRoom({ song, queue: [song], playSong, navigate })).toBe(true)
    expect(navigate).toHaveBeenCalledWith('/room/AB12CD34', { state: { playSongId: 7 } })
    expect(playSong).not.toHaveBeenCalled()
  })

  it('plays locally when the user is only a listener or has no room', () => {
    setRoomSession({ roomId: 'AB12CD34', isController: false })
    const playSong = vi.fn()
    const navigate = vi.fn()
    const song = { id: 7, title: 'Grey Rain' }

    expect(playSongOrInRoom({ song, queue: [song], playSong, navigate })).toBe(false)
    expect(playSong).toHaveBeenCalledWith(song, [song])
    expect(navigate).not.toHaveBeenCalled()

    clearRoomSession()
    expect(getRoomSession()).toBeNull()
    playSong.mockClear()
    expect(playSongOrInRoom({ song, playSong, navigate })).toBe(false)
    expect(playSong).toHaveBeenCalledWith(song, [song])
  })
})
