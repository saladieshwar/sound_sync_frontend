import { useEffect, useState } from 'react'
import { searchSongs } from '../../api/songs'
import { formatTime } from '../../utils/format'
import CoverImage from '../songs/CoverImage'
import { EqBars, PlayIcon, SearchIcon } from '../ui/icons'

const SEARCH_DEBOUNCE_MS = 250

/**
 * Controller-only catalog: browse the full list or search by title/artist/album,
 * then play the choice for everyone in the room.
 */
export default function RoomSongPicker({ catalog, currentSongId, isPlaying, onPlay }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null) // null = show catalog
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setResults(null)
      setSearching(false)
      return undefined
    }
    let cancelled = false
    setSearching(true)
    const timer = setTimeout(() => {
      searchSongs(q)
        .then((songs) => {
          if (!cancelled) setResults(songs)
        })
        .catch(() => {
          if (!cancelled) setResults([])
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, SEARCH_DEBOUNCE_MS)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  const songs = results ?? catalog
  const trimmed = query.trim()
  const emptyMessage = trimmed
    ? searching
      ? 'Searching…'
      : `No songs match “${trimmed}”.`
    : 'No songs in the catalog yet.'

  return (
    <section className="motion-safe:animate-rise">
      <h2 className="mb-3 text-xl font-bold tracking-tight text-white">Pick a song for the room</h2>
      <label className="relative mb-3 block">
        <span className="sr-only">Search songs for the room</span>
        <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500" />
        <input
          data-testid="room-song-search"
          type="search"
          maxLength={100}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search songs, artists, albums"
          className="w-full rounded-xl border border-white/10 bg-neutral-950/60 py-2.5 pr-3 pl-10 text-sm text-neutral-100 outline-none transition placeholder:text-neutral-500 focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/15"
        />
      </label>
      <ul data-testid="room-song-picker" className="flex flex-col gap-0.5">
        {songs.length === 0 ? (
          <li className="rounded-xl border border-dashed border-neutral-800 px-4 py-5 text-center text-sm text-neutral-500">
            {emptyMessage}
          </li>
        ) : (
          songs.map((song) => {
            const current = currentSongId === song.id
            return (
              <li key={song.id}>
                <button
                  type="button"
                  onClick={() => onPlay(song)}
                  className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 sm:px-3 ${
                    current ? 'bg-emerald-500/[0.07] ring-1 ring-emerald-500/15' : 'hover:bg-white/[0.04]'
                  }`}
                >
                  <span className="relative shrink-0">
                    <CoverImage
                      decorative
                      src={song.cover_url}
                      className="h-10 w-10 rounded-md shadow-md shadow-black/40 ring-1 ring-white/5"
                    />
                    <span
                      aria-hidden="true"
                      className={`absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white transition-opacity ${
                        current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                      }`}
                    >
                      {current ? <EqBars playing={isPlaying} /> : <PlayIcon className="h-4 w-4" />}
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate font-medium ${current ? 'text-emerald-400' : 'text-neutral-100'}`}
                    >
                      {song.title}
                    </span>
                    <span className="block truncate text-sm text-neutral-400">{song.artist}</span>
                  </span>
                  <span className="shrink-0 text-sm text-neutral-500 tabular-nums">
                    {formatTime(song.duration_seconds)}
                  </span>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
