import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
