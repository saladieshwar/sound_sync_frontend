import { useState } from 'react'

/**
 * Counts how many times `liked` turned true after the first render, so a like can be
 * celebrated with a fresh animation (use the count as a React key) but loading an
 * already-liked song stays still. A new `songId` resets it without celebrating.
 */
export default function useLikePop(liked, songId = null) {
  const [prev, setPrev] = useState({ liked, songId })
  const [pops, setPops] = useState(0)
  if (liked !== prev.liked || songId !== prev.songId) {
    setPrev({ liked, songId })
    if (liked && songId === prev.songId) setPops((n) => n + 1)
    else if (songId !== prev.songId) setPops(0)
  }
  return pops
}
