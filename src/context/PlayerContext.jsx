import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mediaUrl } from '../config'
import {
  DRIFT_CHECK_MS,
  DRIFT_SAMPLES,
  IN_SYNC_SECONDS,
  MAX_SEEK_LEAD_SECONDS,
  RESYNC_SECONDS,
  SETTLE_ATTEMPTS,
  SETTLE_MS,
  timelinePosition,
} from '../realtime/events'
import { useAuth } from './AuthContext'
import { useLibrary } from './LibraryContext'

const PlayerContext = createContext(null)
const VOLUME_KEY = 'soundsync_volume'
const MUTED_KEY = 'soundsync_muted'
const DEFAULT_VOLUME = 0.8
const RESTART_THRESHOLD_SECONDS = 3
const PAUSED_TOLERANCE_SECONDS = 0.01
const HAVE_FUTURE_DATA = 3 // HTMLMediaElement.readyState: below this, audio is stalled buffering

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

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
  // Room timeline being followed (see syncTo); null outside a Musical Room.
  const roomTimeline = useRef(null)
  // Room sync bookkeeping: when audio last (re)started, how many settle jumps remain, how late
  // this device's audio resumes after a jump (learned, seconds), and whether the drift being
  // measured is the result of our own jump (only then does it teach us the seek lead).
  const syncStartedAt = useRef(0)
  const settleLeft = useRef(0)
  const seekLead = useRef(0)
  const afterJump = useRef(false)

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
      roomTimeline.current = null
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
    roomTimeline.current = null
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

  /**
   * Applies authoritative room state received over the WebSocket and keeps following it.
   * The room is at `positionSeconds` at server time `serverTs`; `serverNow` returns the current
   * server time as estimated on this device (defaults to the local clock).
   */
  const syncTo = useCallback(
    ({ song, positionSeconds, playing, serverTs, serverNow = Date.now }) => {
      if (song && song.id !== currentSong?.id) {
        setQueue([song])
        setIndex(0)
        load(song)
      }
      const songLength = song?.duration_seconds || Infinity
      const timeline = {
        positionSeconds,
        playing,
        serverTs: serverTs ?? serverNow(),
        serverNow,
        songLength,
      }
      roomTimeline.current = timeline
      const target = clamp(timelinePosition(timeline, serverNow()), 0, songLength)
      if (!playing || target >= songLength) {
        if (Math.abs(audio.currentTime - target) > PAUSED_TOLERANCE_SECONDS) {
          audio.currentTime = target
          setPosition(target)
        }
        audio.pause()
        return
      }
      // Small gaps are left to the settle step, which jumps at most once with the learned lead.
      afterJump.current = Math.abs(audio.currentTime - target) > RESYNC_SECONDS
      if (afterJump.current) {
        const landing = clamp(target + seekLead.current, 0, songLength)
        audio.currentTime = landing
        setPosition(landing)
      }
      syncStartedAt.current = Date.now()
      settleLeft.current = SETTLE_ATTEMPTS
      if (audio.paused) setStatus('loading')
      safePlay()
    },
    [audio, currentSong, load, safePlay],
  )

  // Room drift correction (see events.js): measure, then at most a few small jumps after each
  // play / seek / join, never a playback-rate change.
  useEffect(() => {
    let drifts = []
    const correct = () => {
      const timeline = roomTimeline.current
      if (!timeline?.playing || audio.paused || audio.seeking || audio.readyState < HAVE_FUTURE_DATA) {
        drifts = []
        syncStartedAt.current = Date.now() // audio is (re)starting: measure once it runs again
        return
      }
      if (Date.now() - syncStartedAt.current < SETTLE_MS) {
        drifts = []
        return
      }
      const expected = timelinePosition(timeline, timeline.serverNow())
      if (expected >= timeline.songLength) return
      drifts = [...drifts, audio.currentTime - expected].slice(-DRIFT_SAMPLES)
      if (drifts.length < DRIFT_SAMPLES) return
      const drift = median(drifts)
      drifts = []

      const settling = settleLeft.current > 0
      if (settling && Math.abs(drift) <= IN_SYNC_SECONDS) {
        settleLeft.current = 0
        afterJump.current = false
        return
      }
      if (!settling && Math.abs(drift) <= RESYNC_SECONDS) return
      if (!settling) settleLeft.current = SETTLE_ATTEMPTS
      settleLeft.current -= 1
      if (afterJump.current) {
        // Ending up `drift` off after our jump means this device resumes that much late/early.
        const lead = seekLead.current - drift
        seekLead.current = clamp(lead, -MAX_SEEK_LEAD_SECONDS, MAX_SEEK_LEAD_SECONDS)
      }
      audio.currentTime = clamp(expected + seekLead.current, 0, timeline.songLength)
      afterJump.current = true
      syncStartedAt.current = Date.now()
    }
    const timer = setInterval(correct, DRIFT_CHECK_MS)
    return () => clearInterval(timer)
  }, [audio])

  useEffect(() => {
    if (roomLocked) return
    roomTimeline.current = null
    settleLeft.current = 0
  }, [audio, roomLocked])

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
