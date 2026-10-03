import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as libraryApi from '../api/library'
import { apiError, likeOf, playOf, SONGS } from '../testUtils'
import { uniqueSongs } from '../utils/songs'
import { LibraryProvider, useLibrary } from './LibraryContext'

vi.mock('../api/library')
const auth = { isAuthenticated: true }
vi.mock('./AuthContext', () => ({ useAuth: () => auth }))

const { eveningBreeze, greyRain, riseUp } = SONGS

const renderLibrary = () => renderHook(() => useLibrary(), { wrapper: LibraryProvider })

async function renderLoaded() {
  const view = renderLibrary()
  await waitFor(() => expect(view.result.current.status).toBe('ready'))
  return view
}

beforeEach(() => {
  auth.isAuthenticated = true
  libraryApi.getLikedSongs.mockResolvedValue([likeOf(riseUp)])
  libraryApi.getRecentlyPlayed.mockResolvedValue([playOf(greyRain)])
})

describe('uniqueSongs', () => {
  it('keeps the most recent play of each song, in order', () => {
    const entries = [playOf(eveningBreeze), playOf(greyRain), playOf(eveningBreeze)]
    expect(uniqueSongs(entries)).toEqual([eveningBreeze, greyRain])
  })
})

describe('LibraryProvider', () => {
  it('loads liked songs and play history for an authenticated user', async () => {
    const { result } = await renderLoaded()
    expect(result.current.likedSongs).toEqual([likeOf(riseUp)])
    expect(result.current.likedIds.has(riseUp.id)).toBe(true)
    expect(result.current.recentSongs).toEqual([greyRain])
  })

  it('does not call the API and stays empty when logged out', () => {
    auth.isAuthenticated = false
    const { result } = renderLibrary()
    expect(result.current.status).toBe('idle')
    expect(result.current.likedSongs).toEqual([])
    expect(libraryApi.getLikedSongs).not.toHaveBeenCalled()
  })

  it('exposes a load error and recovers on refresh', async () => {
    libraryApi.getLikedSongs.mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR', 'boom'))
    const { result } = renderLibrary()
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error.response.status).toBe(500)

    await act(() => result.current.refresh())
    expect(result.current.status).toBe('ready')
    expect(result.current.error).toBeNull()
  })

  it('likes a song: newest first and reflected in likedIds', async () => {
    libraryApi.likeSong.mockResolvedValue(likeOf(eveningBreeze, '2026-10-03T11:00:00Z'))
    const { result } = await renderLoaded()

    await act(() => result.current.toggleLike(eveningBreeze))

    expect(libraryApi.likeSong).toHaveBeenCalledWith(eveningBreeze.id)
    expect(result.current.likedSongs.map((l) => l.song.id)).toEqual([eveningBreeze.id, riseUp.id])
    expect(result.current.likedIds.has(eveningBreeze.id)).toBe(true)
  })

  it('unlikes an already-liked song', async () => {
    libraryApi.unlikeSong.mockResolvedValue({ status: 204 })
    const { result } = await renderLoaded()

    await act(() => result.current.toggleLike(riseUp))

    expect(libraryApi.unlikeSong).toHaveBeenCalledWith(riseUp.id)
    expect(result.current.likedSongs).toEqual([])
    expect(result.current.likedIds.has(riseUp.id)).toBe(false)
  })

  it('ignores a second toggle while the first is in flight', async () => {
    let resolveLike
    libraryApi.likeSong.mockReturnValue(new Promise((r) => (resolveLike = r)))
    const { result } = await renderLoaded()

    let first
    act(() => {
      first = result.current.toggleLike(eveningBreeze)
      result.current.toggleLike(eveningBreeze)
    })
    await act(async () => {
      resolveLike(likeOf(eveningBreeze))
      await first
    })

    expect(libraryApi.likeSong).toHaveBeenCalledTimes(1)
    expect(libraryApi.unlikeSong).not.toHaveBeenCalled()
  })

  it('resyncs from the server when a like fails', async () => {
    libraryApi.likeSong.mockRejectedValue(apiError(404, 'SONG_NOT_FOUND', 'Song not found'))
    const { result } = await renderLoaded()
    libraryApi.getLikedSongs.mockClear()

    await act(() => result.current.toggleLike(eveningBreeze))

    expect(libraryApi.getLikedSongs).toHaveBeenCalledTimes(1)
    expect(result.current.likedIds.has(eveningBreeze.id)).toBe(false)
  })

  it('records plays most recent first and de-duplicates the song list', async () => {
    libraryApi.logPlay.mockImplementation(async (id) =>
      playOf(Object.values(SONGS).find((s) => s.id === id)),
    )
    const { result } = await renderLoaded()

    await act(() => result.current.recordPlay(eveningBreeze))
    await act(() => result.current.recordPlay(greyRain))

    expect(result.current.recentlyPlayed.map((r) => r.song.id)).toEqual([
      greyRain.id,
      eveningBreeze.id,
      greyRain.id,
    ])
    expect(result.current.recentSongs).toEqual([greyRain, eveningBreeze])
  })

  it('keeps play history to 20 entries', async () => {
    libraryApi.getRecentlyPlayed.mockResolvedValue(Array.from({ length: 20 }, () => playOf(greyRain)))
    libraryApi.logPlay.mockResolvedValue(playOf(riseUp))
    const { result } = await renderLoaded()

    await act(() => result.current.recordPlay(riseUp))

    expect(result.current.recentlyPlayed).toHaveLength(20)
    expect(result.current.recentlyPlayed[0].song).toEqual(riseUp)
  })

  it('swallows play-logging failures', async () => {
    libraryApi.logPlay.mockRejectedValue(apiError(500, 'INTERNAL_ERROR', 'boom'))
    const { result } = await renderLoaded()
    await expect(act(() => result.current.recordPlay(riseUp))).resolves.not.toThrow()
    expect(result.current.recentSongs).toEqual([greyRain])
  })
})
