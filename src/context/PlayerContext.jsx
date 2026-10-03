import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { mediaUrl } from '../config'
import { useLibrary } from './LibraryContext'

const PlayerContext = createContext(null)
const VOLUME_KEY = 'soundsync_volume'

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio())
  const { recordPlay } = useLibrary()

  const [queue, setQueue] = useState([])
  const [index, setIndex] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(() => Number(localStorage.getItem(VOLUME_KEY) ?? 0.8))
  const [muted, setMuted] = useState(false)
  // While inside a Musical Room, local controls are disabled; playback follows room events.
  const [roomLocked, setRoomLocked] = useState(false)

  const currentSong = queue[index] ?? null

  useEffect(() => {
    const audio = audioRef.current
    const onTime = () => setPosition(audio.currentTime)
    const onMeta = () => setDuration(audio.duration || 0)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [])

  useEffect(() => {
    audioRef.current.volume = volume
    audioRef.current.muted = muted
    localStorage.setItem(VOLUME_KEY, String(volume))
  }, [volume, muted])

  const load = useCallback((song) => {
    const audio = audioRef.current
    const src = mediaUrl(song.audio_url)
    if (audio.src !== src) audio.src = src
  }, [])

  const playSong = useCallback(
    (song, songQueue = [song]) => {
      const i = songQueue.findIndex((s) => s.id === song.id)
      setQueue(songQueue)
      setIndex(i === -1 ? 0 : i)
      load(song)
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {})
      recordPlay(song).catch(() => {})
    },
    [load, recordPlay],
  )

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!currentSong) return
    if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }, [currentSong])

  const next = useCallback(() => {
    if (index < queue.length - 1) playSong(queue[index + 1], queue)
  }, [index, queue, playSong])

  const previous = useCallback(() => {
    if (audioRef.current.currentTime > 3 || index <= 0) {
      audioRef.current.currentTime = 0
    } else {
      playSong(queue[index - 1], queue)
    }
  }, [index, queue, playSong])

  const seek = useCallback((seconds) => {
    audioRef.current.currentTime = seconds
    setPosition(seconds)
  }, [])

  const setVolume = useCallback((v) => {
    setVolumeState(v)
    if (v > 0) setMuted(false)
  }, [])

  const toggleMute = useCallback(() => setMuted((m) => !m), [])

  useEffect(() => {
    const audio = audioRef.current
    audio.addEventListener('ended', next)
    return () => audio.removeEventListener('ended', next)
  }, [next])

  /** Applies authoritative room state received over the WebSocket. */
  const syncTo = useCallback(
    ({ song, positionSeconds, playing }) => {
      const audio = audioRef.current
      if (song && song.id !== currentSong?.id) {
        setQueue([song])
        setIndex(0)
        load(song)
      }
      if (Math.abs(audio.currentTime - positionSeconds) > 0.5) {
        audio.currentTime = positionSeconds
      }
      if (playing) audio.play().catch(() => {})
      else audio.pause()
    },
    [currentSong, load],
  )

  const value = useMemo(
    () => ({
      currentSong,
      queue,
      isPlaying,
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
      setRoomLocked,
    }),
    [
      currentSong,
      queue,
      isPlaying,
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
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export const usePlayer = () => useContext(PlayerContext)
