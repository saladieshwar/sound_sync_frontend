import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as libraryApi from '../api/library'
import { useAuth } from './AuthContext'

const LibraryContext = createContext(null)

export function LibraryProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [likedSongs, setLikedSongs] = useState([])
  const [recentlyPlayed, setRecentlyPlayed] = useState([])

  const refresh = useCallback(async () => {
    const [liked, recent] = await Promise.all([
      libraryApi.getLikedSongs(),
      libraryApi.getRecentlyPlayed(),
    ])
    setLikedSongs(liked)
    setRecentlyPlayed(recent)
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      refresh()
    } else {
      setLikedSongs([])
      setRecentlyPlayed([])
    }
  }, [isAuthenticated, refresh])

  const likedIds = useMemo(() => new Set(likedSongs.map((l) => l.song.id)), [likedSongs])

  const toggleLike = useCallback(
    async (song) => {
      if (likedIds.has(song.id)) {
        await libraryApi.unlikeSong(song.id)
        setLikedSongs((prev) => prev.filter((l) => l.song.id !== song.id))
      } else {
        const like = await libraryApi.likeSong(song.id)
        setLikedSongs((prev) => [like, ...prev])
      }
    },
    [likedIds],
  )

  const recordPlay = useCallback(async (song) => {
    const entry = await libraryApi.logPlay(song.id)
    setRecentlyPlayed((prev) => [entry, ...prev].slice(0, 20))
  }, [])

  const value = useMemo(
    () => ({ likedSongs, likedIds, recentlyPlayed, toggleLike, recordPlay, refresh }),
    [likedSongs, likedIds, recentlyPlayed, toggleLike, recordPlay, refresh],
  )

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>
}

export const useLibrary = () => useContext(LibraryContext)
