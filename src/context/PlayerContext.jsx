import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mediaUrl } from '../config'
import { useAuth } from './AuthContext'
import { useLibrary } from './LibraryContext'

const PlayerContext = createContext(null)
const VOLUME_KEY = 'soundsync_volume'
const MUTED_KEY = 'soundsync_muted'
const DEFAULT_VOLUME = 0.8
const RESTART_THRESHOLD_SECONDS = 3
// Matches DRIFT_TOLERANCE_SECONDS in realtime/events.js: smaller drifts are not corrected.
const SYNC_TOLERANCE_SECONDS = 0.5

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

function readStoredVolume() {
  const raw = localStorage.getItem(VOLUME_KEY)
  const value = raw === null ? Number.NaN : Number(raw)
  return Number.isFinite(value) ? clamp(value, 0, 1) : DEFAULT_VOLUME
}

const readStoredMuted = () => localStorage.getItem(MUTED_KEY) === 'true'

/**
 * Single-device playback state. `createAudio` exists so tests can inject a fake media element.
 * status: idle (nothing loaded) | loading | playing | paused | error
 */
export function PlayerProvider({ children, createAudio = () => new Audio() }) {
  const audioRef = useRef(null)
  if (audioRef.current === null) audioRef.current = createAudio()
  const audio = audioRef.current
  const { isAuthenticated } = useAuth()
  const { recordPlay } = useLibrary()

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [status, setStatus] = useState('idle')
  const [position, setPosition] = useState(0)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [volume, setVolumeState] = useState(readStoredVolume)
  const [muted, setMuted] = useState(readStoredMuted)
  // While inside a Musical Room, local controls are disabled; playback follows room events.
  const [roomLocked, setRoomLocked] = useState(false)

  const currentSong = queue[index] ?? null
  const hasNext = index >= 0 && index < queue.length - 1
  const duration =
    Number.isFinite(mediaDuration) && mediaDuration > 0
      ? mediaDuration
      : (currentSong?.duration_seconds ?? 0)

  const safePlay = useCallback(() => {
    try {
      const pending = audio.play()
      if (pending && typeof pending.catch === 'function') {
        pending.catch((err) => {
          if (err?.name === 'AbortError') return // superseded by a newer load/pause
          setStatus(err?.name === 'NotAllowedError' ? 'paused' : 'error')
        })
      }
    } catch {
      setStatus('error')
    }
  }, [audio])

  useEffect(() => {
    const hasSource = () => Boolean(audio.getAttribute?.('src') ?? audio.src)
    const handlers = {
      timeupdate: () => setPosition(audio.currentTime),
      loadedmetadata: () => setMediaDuration(audio.duration),
      durationchange: () => setMediaDuration(audio.duration),
      waiting: () => setStatus('loading'),
      playing: () => setStatus('playing'),
      // A song switch queues a stale `pause` from the old source; ignore it if play was requested since.
      pause: () => audio.paused && setStatus((s) => (s === 'error' ? s : 'paused')),
      canplay: () => setStatus((s) => (s === 'loading' && audio.paused ? 'paused' : s)),
      error: () => hasSource() && setStatus('error'),
    }
    for (const [event, handler] of Object.entries(handlers)) audio.addEventListener(event, handler)
    return () => {
      for (const [event, handler] of Object.entries(handlers)) audio.removeEventListener(event, handler)
    }
  }, [audio])

  useEffect(() => {
    audio.volume = volume
    audio.muted = muted
    localStorage.setItem(VOLUME_KEY, String(volume))
    localStorage.setItem(MUTED_KEY, String(muted))
  }, [audio, volume, muted])

  const load = useCallback(
    (song) => {
      const src = mediaUrl(song.audio_url)
      if (audio.src !== src) {
        audio.src = src
        setMediaDuration(0)
      }
    },
    [audio],
  )

  const playSong = useCallback(
    (song, songQueue = [song]) => {
      const i = songQueue.findIndex((s) => s.id === song.id)
      setQueue(songQueue)
      setIndex(i === -1 ? 0 : i)
      load(song)
      audio.currentTime = 0
      setPosition(0)
      setStatus('loading')
      safePlay()
      recordPlay(song)
    },
    [audio, load, safePlay, recordPlay],
  )

  const togglePlay = useCallback(() => {
    if (!currentSong) return
    if (status === 'error') {
      audio.load?.()
      setStatus('loading')
      safePlay()
    } else if (audio.paused) {
      safePlay()
    } else {
      audio.pause()
    }
  }, [audio, currentSong, status, safePlay])

  const seek = useCallback(
    (seconds) => {
      if (!Number.isFinite(seconds)) return
      const target = clamp(seconds, 0, duration || seconds)
      audio.currentTime = target
      setPosition(target)
    },
    [audio, duration],
  )

  const next = useCallback(() => {
    if (hasNext) playSong(queue[index + 1], queue)
  }, [hasNext, index, queue, playSong])

  const previous = useCallback(() => {
    if (!currentSong) return
    if (audio.currentTime > RESTART_THRESHOLD_SECONDS || index <= 0) seek(0)
    else playSong(queue[index - 1], queue)
  }, [audio, currentSong, index, queue, playSong, seek])

  const setVolume = useCallback((v) => {
    if (!Number.isFinite(v)) return
    const value = clamp(v, 0, 1)
    setVolumeState(value)
    if (value > 0) setMuted(false)
  }, [])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  useEffect(() => {
    const onEnded = () => {
      if (hasNext) next()
      else setStatus('paused')
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [audio, hasNext, next])

  /** Unloads the current song entirely (logout, leaving a Musical Room). */
  const stop = useCallback(() => {
    audio.pause()
    audio.removeAttribute?.('src')
    audio.load?.()
    setQueue([])
    setIndex(-1)
    setPosition(0)
    setMediaDuration(0)
    setStatus('idle')
  }, [audio])

  useEffect(() => {
    if (!isAuthenticated) stop()
  }, [isAuthenticated, stop])

  /** Applies authoritative room state received over the WebSocket. */
  const syncTo = useCallback(
    ({ song, positionSeconds, playing }) => {
      if (song && song.id !== currentSong?.id) {
        setQueue([song])
        setIndex(0)
        load(song)
      }
      const songLength = song?.duration_seconds || Infinity
      const target = clamp(positionSeconds, 0, songLength)
      if (Math.abs(audio.currentTime - target) > SYNC_TOLERANCE_SECONDS) {
        audio.currentTime = target
        setPosition(target)
      }
      if (playing && target < songLength) {
        if (audio.paused) setStatus('loading')
        safePlay()
      } else {
        audio.pause()
      }
    },
    [audio, currentSong, load, safePlay],
  )

  const value = useMemo(
    () => ({
      currentSong,
      queue,
      index,
      status,
      isPlaying: status === 'playing',
      isLoading: status === 'loading',
      hasError: status === 'error',
      hasNext,
      position,
      duration,
      volume,
      muted,
      roomLocked,
      playSong,
      togglePlay,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      syncTo,
      stop,
      setRoomLocked,
    }),
    [
      currentSong,
      queue,
      index,
      status,
      hasNext,
      position,
      duration,
      volume,
      muted,
      roomLocked,
      playSong,
      togglePlay,
      next,
      previous,
      seek,
      setVolume,
      toggleMute,
      syncTo,
      stop,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export const usePlayer = () => useContext(PlayerContext)
