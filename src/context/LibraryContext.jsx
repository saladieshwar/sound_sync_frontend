import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import * as libraryApi from '../api/library'
import { uniqueSongs } from '../utils/songs'
import { useAuth } from './AuthContext'

const LibraryContext = createContext(null)

const RECENT_LIMIT = 20

export function LibraryProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [likedSongs, setLikedSongs] = useState([])
  const [recentlyPlayed, setRecentlyPlayed] = useState([])
  // idle (not loaded yet) | loading (manual refresh) | ready | error
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const pendingLikes = useRef(new Set())

  const load = useCallback(async () => {
    try {
      const [liked, recent] = await Promise.all([
        libraryApi.getLikedSongs(),
        libraryApi.getRecentlyPlayed(),
      ])
      setLikedSongs(liked)
      setRecentlyPlayed(recent)
      setError(null)
      setStatus('ready')
    } catch (err) {
      setError(err)
      setStatus('error')
    }
  }, [])

  const refresh = useCallback(async () => {
    setStatus('loading')
    await load()
  }, [load])

  useEffect(() => {
    if (isAuthenticated) {
      load()
    } else {
      setLikedSongs([])
      setRecentlyPlayed([])
      setError(null)
      setStatus('idle')
    }
  }, [isAuthenticated, load])

  const likedIds = useMemo(() => new Set(likedSongs.map((l) => l.song.id)), [likedSongs])
  const recentSongs = useMemo(() => uniqueSongs(recentlyPlayed), [recentlyPlayed])

  const toggleLike = useCallback(
    async (song) => {
      if (pendingLikes.current.has(song.id)) return
      pendingLikes.current.add(song.id)
      try {
        if (likedIds.has(song.id)) {
          await libraryApi.unlikeSong(song.id)
          setLikedSongs((prev) => prev.filter((l) => l.song.id !== song.id))
        } else {
          const like = await libraryApi.likeSong(song.id)
          setLikedSongs((prev) => [like, ...prev.filter((l) => l.song.id !== song.id)])
        }
      } catch {
        await refresh()
      } finally {
        pendingLikes.current.delete(song.id)
      }
    },
    [likedIds, refresh],
  )

  const recordPlay = useCallback(async (song) => {
    try {
      const entry = await libraryApi.logPlay(song.id)
      setRecentlyPlayed((prev) => [entry, ...prev].slice(0, RECENT_LIMIT))
    } catch {
      // Play history is best-effort; playback must not fail because logging did.
    }
  }, [])

  const value = useMemo(
    () => ({
      likedSongs,
      likedIds,
      recentlyPlayed,
      recentSongs,
      status,
      error,
      toggleLike,
      recordPlay,
      refresh,
    }),
    [likedSongs, likedIds, recentlyPlayed, recentSongs, status, error, toggleLike, recordPlay, refresh],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export const useLibrary = () => useContext(LibraryContext)
