import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DRIFT_CHECK_MS, IN_SYNC_SECONDS } from '../realtime/events'
import { FakeAudio, SONGS } from '../testUtils'
import { PlayerProvider, usePlayer } from './PlayerContext'

const auth = { isAuthenticated: true }
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))
const recordPlay = vi.fn()
vi.mock('./LibraryContext', () => ({ useLibrary: () => ({ recordPlay }) }))

const { eveningBreeze, greyRain, heartstrings } = SONGS
const QUEUE = [eveningBreeze, heartstrings, greyRain]

let audio

function renderPlayer() {
  return renderHook(() => usePlayer(), {
    wrapper: ({ children }) => <PlayerProvider createAudio={() => audio}>{children}</PlayerProvider>,
  })
}

function renderPlaying(song = eveningBreeze, queue = QUEUE) {
  const view = renderPlayer()
  act(() => view.result.current.playSong(song, queue))
  return view
}

beforeEach(() => {
  auth.isAuthenticated = true
  localStorage.clear()
  audio = new FakeAudio()
})

describe('PlayerContext: playing songs', () => {
  it('starts idle with nothing loaded', () => {
    const { result } = renderPlayer()
    expect(result.current.currentSong).toBeNull()
    expect(result.current.status).toBe('idle')
    expect(result.current.duration).toBe(0)
  })

  it('plays a song from the media server and logs the play once', () => {
    const { result } = renderPlaying()
    expect(audio.src).toMatch(/\/media\/audio\/sample-1\.mp3$/)
    expect(audio.play).toHaveBeenCalledTimes(1)
    expect(result.current.currentSong).toEqual(eveningBreeze)
    expect(result.current.queue).toEqual(QUEUE)
    expect(result.current.isPlaying).toBe(true)
    expect(recordPlay).toHaveBeenCalledTimes(1)
    expect(recordPlay).toHaveBeenCalledWith(eveningBreeze)
  })

  it('shows the catalog duration until the file metadata arrives', () => {
    const { result } = renderPlaying()
    expect(result.current.duration).toBe(eveningBreeze.duration_seconds)
    act(() => audio.loadMetadata(214.4))
    expect(result.current.duration).toBe(214.4)
  })

  it('tracks playback position from the audio element', () => {
    const { result } = renderPlaying()
    act(() => audio.advanceTo(12.3))
    expect(result.current.position).toBe(12.3)
  })

  it('pauses and resumes without restarting', () => {
    const { result } = renderPlaying()
    act(() => audio.advanceTo(30))
    act(() => result.current.togglePlay())
    expect(result.current.isPlaying).toBe(false)
    expect(audio.currentTime).toBe(30)

    act(() => result.current.togglePlay())
    expect(result.current.isPlaying).toBe(true)
    expect(audio.currentTime).toBe(30)
    expect(recordPlay).toHaveBeenCalledTimes(1)
  })

  it('is in a loading state until the audio actually starts', () => {
    audio.playResult = new Promise(() => {})
    const { result } = renderPlaying()
    expect(result.current.status).toBe('loading')
    act(() => audio.emit('playing'))
    expect(result.current.status).toBe('playing')
    act(() => audio.emit('waiting'))
    expect(result.current.isLoading).toBe(true)
  })

  it('treats a blocked autoplay as paused, not as an error', async () => {
    audio.playResult = Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }))
    const { result } = renderPlaying()
    await act(async () => {})
    expect(result.current.status).toBe('paused')
  })

  it('reports a broken file and retries on play', () => {
    const { result } = renderPlaying()
    act(() => audio.emit('error'))
    expect(result.current.hasError).toBe(true)

    act(() => result.current.togglePlay())
    expect(audio.load).toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(true)
  })
})

describe('PlayerContext: seeking', () => {
  it('seeks to the exact requested position', () => {
    const { result } = renderPlaying()
    act(() => result.current.seek(42.5))
    expect(audio.currentTime).toBe(42.5)
    expect(result.current.position).toBe(42.5)
  })

  it('clamps seeks to the song length and to zero', () => {
    const { result } = renderPlaying()
    act(() => result.current.seek(10_000))
    expect(audio.currentTime).toBe(eveningBreeze.duration_seconds)
    act(() => result.current.seek(-5))
    expect(audio.currentTime).toBe(0)
  })

  it('ignores invalid seek values', () => {
    const { result } = renderPlaying()
    act(() => audio.advanceTo(20))
    act(() => result.current.seek(Number.NaN))
    expect(audio.currentTime).toBe(20)
  })
})

describe('PlayerContext: queue navigation', () => {
  it('next plays the following song and logs it', () => {
    const { result } = renderPlaying()
    act(() => result.current.next())
    expect(result.current.currentSong).toEqual(heartstrings)
    expect(audio.src).toMatch(/sample-3\.mp3$/)
    expect(recordPlay).toHaveBeenLastCalledWith(heartstrings)
  })

  it('next does nothing on the last song', () => {
    const { result } = renderPlaying(greyRain)
    expect(result.current.hasNext).toBe(false)
    act(() => result.current.next())
    expect(result.current.currentSong).toEqual(greyRain)
    expect(recordPlay).toHaveBeenCalledTimes(1)
  })

  it('previous restarts the song when more than 3 seconds in', () => {
    const { result } = renderPlaying(heartstrings)
    act(() => audio.advanceTo(45))
    act(() => result.current.previous())
    expect(result.current.currentSong).toEqual(heartstrings)
    expect(audio.currentTime).toBe(0)
    expect(recordPlay).toHaveBeenCalledTimes(1)
  })

  it('previous goes back a song when near the start', () => {
    const { result } = renderPlaying(heartstrings)
    act(() => audio.advanceTo(1))
    act(() => result.current.previous())
    expect(result.current.currentSong).toEqual(eveningBreeze)
  })

  it('advances automatically when a song ends, and stops after the last one', () => {
    const { result } = renderPlaying(heartstrings)
    act(() => audio.emit('ended'))
    expect(result.current.currentSong).toEqual(greyRain)
    expect(result.current.isPlaying).toBe(true)

    act(() => {
      audio.paused = true
      audio.emit('ended')
    })
    expect(result.current.currentSong).toEqual(greyRain)
    expect(result.current.isPlaying).toBe(false)
  })
})

describe('PlayerContext: volume and mute persistence', () => {
  it('defaults to 80% volume, unmuted', () => {
    const { result } = renderPlayer()
    expect(result.current.volume).toBe(0.8)
    expect(result.current.muted).toBe(false)
    expect(audio.volume).toBe(0.8)
  })

  it('persists volume across reloads', () => {
    const first = renderPlayer()
    act(() => first.result.current.setVolume(0.35))
    expect(audio.volume).toBe(0.35)
    expect(localStorage.getItem('soundsync_volume')).toBe('0.35')
    first.unmount()

    audio = new FakeAudio()
    const { result } = renderPlayer()
    expect(result.current.volume).toBe(0.35)
    expect(audio.volume).toBe(0.35)
  })

  it('persists mute across reloads', () => {
    const first = renderPlayer()
    act(() => first.result.current.toggleMute())
    expect(audio.muted).toBe(true)
    expect(localStorage.getItem('soundsync_muted')).toBe('true')
    first.unmount()

    audio = new FakeAudio()
    const { result } = renderPlayer()
    expect(result.current.muted).toBe(true)
    expect(audio.muted).toBe(true)

    act(() => result.current.toggleMute())
    expect(audio.muted).toBe(false)
    expect(localStorage.getItem('soundsync_muted')).toBe('false')
  })

  it('raising the volume unmutes', () => {
    const { result } = renderPlayer()
    act(() => result.current.toggleMute())
    act(() => result.current.setVolume(0.5))
    expect(result.current.muted).toBe(false)
  })

  it.each([
    ['garbage', 0.8],
    ['5', 1],
    ['-1', 0],
  ])('sanitizes a stored volume of %s', (stored, expected) => {
    localStorage.setItem('soundsync_volume', stored)
    const { result } = renderPlayer()
    expect(result.current.volume).toBe(expected)
  })

  it('volume changes do not interrupt playback', () => {
    const { result } = renderPlaying()
    act(() => result.current.setVolume(0.2))
    act(() => result.current.toggleMute())
    expect(audio.pause).not.toHaveBeenCalled()
    expect(result.current.isPlaying).toBe(true)
  })
})

describe('PlayerContext: session', () => {
  it('stops and clears playback on logout', () => {
    const view = renderPlaying()
    auth.isAuthenticated = false
    view.rerender()
    expect(audio.pause).toHaveBeenCalled()
    expect(audio.src).toBe('')
    expect(view.result.current.currentSong).toBeNull()
    expect(view.result.current.status).toBe('idle')
  })
})

describe('PlayerContext: Musical Room sync', () => {
  it('loads the room song at the room position and plays it without logging a play', () => {
    const { result } = renderPlayer()
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 42, playing: true }))
    expect(result.current.currentSong).toEqual(heartstrings)
    expect(audio.src).toBe('http://localhost:8000/media/audio/sample-3.mp3')
    expect(audio.currentTime).toBe(42)
    expect(result.current.status).toBe('playing')
    expect(recordPlay).not.toHaveBeenCalled()
  })

  it('follows the room timeline on the server clock, not the device clock', () => {
    const { result } = renderPlayer()
    const serverNow = () => 12_000 // device clock is irrelevant: 2 s after the event, server time
    act(() =>
      result.current.syncTo({ song: heartstrings, positionSeconds: 40, playing: true, serverTs: 10_000, serverNow }),
    )
    expect(audio.currentTime).toBe(42)
  })

  describe('drift correction', () => {
    let serverMs
    const serverNow = () => serverMs

    beforeEach(() => {
      vi.useFakeTimers()
      serverMs = 10_000
    })
    afterEach(() => vi.useRealTimers())

    /**
     * Simulated device: after every jump its audio resumes `resumeDelay` seconds late, and
     * `noise(i)` is added to the i-th position reading. Records every jump the player makes.
     */
    const simulateDevice = ({ resumeDelay = 0, noise = () => 0 } = {}) => {
      const device = { landing: 0, landedAt: serverMs, jumps: [], readings: 0 }
      Object.defineProperty(audio, 'currentTime', {
        configurable: true,
        get: () => {
          const played = Math.max(0, (serverMs - device.landedAt) / 1000 - resumeDelay)
          device.readings += 1
          return device.landing + played + noise(device.readings)
        },
        set: (value) => {
          device.landing = value
          device.landedAt = serverMs
          device.jumps.push(value)
        },
      })
      return device
    }

    const roomPosition = () => 40 + (serverMs - 10_000) / 1000

    /** Joins a room playing from 40 s at server time 10 000. */
    const startRoom = () => {
      const view = renderPlayer()
      act(() =>
        view.result.current.syncTo({
          song: heartstrings,
          positionSeconds: 40,
          playing: true,
          serverTs: 10_000,
          serverNow,
        }),
      )
      return view
    }

    /** Lets `ms` pass on both the device and the server clock. */
    const run = (ms) => {
      for (let t = 0; t < ms; t += DRIFT_CHECK_MS) {
        serverMs += DRIFT_CHECK_MS
        act(() => vi.advanceTimersByTime(DRIFT_CHECK_MS))
      }
    }

    it('lands in sync with one small jump on a device that resumes late, then leaves audio alone', () => {
      const device = simulateDevice({ resumeDelay: 0.12 })
      startRoom()
      expect(device.jumps).toEqual([40])

      run(5_000)
      expect(device.jumps).toHaveLength(2) // one settle jump, already compensating the delay
      run(60_000)
      expect(device.jumps).toHaveLength(2) // nothing more for the rest of the song
      expect(Math.abs(audio.currentTime - roomPosition())).toBeLessThanOrEqual(IN_SYNC_SECONDS)
      expect(audio.playbackRate).toBe(1)
    })

    it('never jumps for small measurement jitter', () => {
      const device = simulateDevice({ noise: (i) => (i % 2 ? 0.03 : -0.03) })
      startRoom()
      run(60_000)
      expect(device.jumps).toEqual([40])
    })

    it('resyncs once audio falls clearly behind mid-song, e.g. after a network stall', () => {
      const device = simulateDevice()
      startRoom()
      run(5_000)
      expect(device.jumps).toEqual([40])

      device.landing -= 0.4 // audio stalled for 0.4 s
      run(5_000)
      expect(device.jumps).toHaveLength(2)
      expect(Math.abs(audio.currentTime - roomPosition())).toBeLessThanOrEqual(IN_SYNC_SECONDS)
      run(30_000)
      expect(device.jumps).toHaveLength(2)
    })

    it('uses the learned resume delay so later resyncs need one jump only', () => {
      const device = simulateDevice({ resumeDelay: 0.12 })
      startRoom()
      run(5_000)
      expect(device.jumps).toHaveLength(2)

      device.landing -= 0.4
      run(5_000)
      expect(device.jumps).toHaveLength(3)
      expect(Math.abs(audio.currentTime - roomPosition())).toBeLessThanOrEqual(IN_SYNC_SECONDS)
      run(30_000)
      expect(device.jumps).toHaveLength(3)
    })

    it('ignores a single bad reading', () => {
      const device = simulateDevice({ noise: (i) => (i === 20 ? -2 : 0) })
      startRoom()
      run(30_000)
      expect(device.jumps).toEqual([40])
    })

    it('stops following when the room pauses', () => {
      const device = simulateDevice()
      const { result } = startRoom()
      run(2_000)
      act(() =>
        result.current.syncTo({ song: heartstrings, positionSeconds: 50, playing: false, serverTs: serverMs, serverNow }),
      )
      expect(audio.paused).toBe(true)
      expect(device.jumps.at(-1)).toBe(50)
      const jumps = device.jumps.length
      run(10_000)
      expect(device.jumps).toHaveLength(jumps)
    })
  })

  it('leaves small gaps to the settle step and jumps on large ones', () => {
    const { result } = renderPlayer()
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 42, playing: true }))
    act(() => audio.advanceTo(42.1))
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 42, playing: true }))
    expect(audio.currentTime).toBe(42.1)

    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 60, playing: true }))
    expect(audio.currentTime).toBe(60)
  })

  it('pauses at the room position', () => {
    const { result } = renderPlayer()
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 10, playing: true }))
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 15, playing: false }))
    expect(audio.paused).toBe(true)
    expect(audio.currentTime).toBe(15)
  })

  it('does not start a song whose room position is past its end', () => {
    const { result } = renderPlayer()
    act(() => result.current.syncTo({ song: heartstrings, positionSeconds: 999, playing: true }))
    expect(audio.currentTime).toBe(heartstrings.duration_seconds)
    expect(audio.play).not.toHaveBeenCalled()
  })

  it('stop unloads the song entirely', () => {
    const { result } = renderPlaying()
    act(() => result.current.stop())
    expect(audio.paused).toBe(true)
    expect(audio.src).toBe('')
    expect(result.current.currentSong).toBeNull()
    expect(result.current.status).toBe('idle')
  })
})
