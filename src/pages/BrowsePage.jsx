import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { songsByAlbum, songsByCategory } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import { tileGradient } from '../components/songs/art'
import CoverImage from '../components/songs/CoverImage'
import SongList from '../components/songs/SongList'
import { MusicIcon, PlayIcon } from '../components/ui/icons'
import { usePlayer } from '../context/PlayerContext'

function totalLength(songs) {
  const minutes = Math.round(songs.reduce((sum, s) => sum + (s.duration_seconds ?? 0), 0) / 60)
  return minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)} hr ${minutes % 60} min`
}

/** mode: 'category' | 'album' */
export default function BrowsePage({ mode }) {
  const { name } = useParams()
  const { playSong } = usePlayer()
  const fetcher = useCallback(
    () => (mode === 'album' ? songsByAlbum(name) : songsByCategory(name)),
    [mode, name],
  )
  const { data, loading, error, reload } = useApiQuery(fetcher)
  const songs = data ?? []
  const isAlbum = mode === 'album'
  const gradient = tileGradient(name)

  const meta = [
    isAlbum && songs[0]?.artist,
    songs.length > 0 && `${songs.length} ${songs.length === 1 ? 'song' : 'songs'}`,
    songs.length > 0 && totalLength(songs),
  ].filter(Boolean)

  return (
    <div className="mx-auto max-w-7xl min-[1800px]:max-w-400">
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/50 p-5 shadow-2xl shadow-black/30 motion-safe:animate-rise sm:p-8">
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 bg-linear-to-br opacity-30 ${gradient}`}
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-t from-neutral-950/90 via-neutral-950/50 to-transparent" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:gap-7">
          {isAlbum ? (
            <CoverImage
              decorative
              src={songs[0]?.cover_url}
              className="h-32 w-32 shrink-0 rounded-2xl shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:h-44 sm:w-44"
            />
          ) : (
            <div
              aria-hidden="true"
              className={`flex h-32 w-32 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br text-white/80 shadow-2xl shadow-black/60 ring-1 ring-white/10 sm:h-44 sm:w-44 ${gradient}`}
            >
              <MusicIcon className="h-1/3 w-1/3 drop-shadow" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300/90 uppercase">{mode}</p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight break-words text-white capitalize sm:text-5xl">
              {name}
            </h1>
            {meta.length > 0 && (
              <p className="mt-3 flex flex-wrap items-center gap-x-2 text-sm text-neutral-300">
                {meta.map((m, i) => (
                  <span key={`${i}-${m}`} className="flex items-center gap-2">
                    {i > 0 && <span aria-hidden="true" className="h-1 w-1 rounded-full bg-neutral-500" />}
                    {m}
                  </span>
                ))}
              </p>
            )}
          </div>
          {songs.length > 0 && (
            <button
              data-testid="browse-play-all"
              onClick={() => playSong(songs[0], songs)}
              className="flex items-center gap-2 self-start rounded-full bg-emerald-500 px-5 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition duration-200 hover:scale-[1.03] hover:bg-emerald-400 active:scale-95 sm:self-end"
            >
              <PlayIcon className="h-4 w-4" />
              Play all
            </button>
          )}
        </div>
      </header>
      <div className="motion-safe:animate-rise">
        <SongList
          songs={songs}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage={`No songs in this ${mode} yet.`}
        />
      </div>
    </div>
  )
}
