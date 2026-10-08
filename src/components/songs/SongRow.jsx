import { useLibrary } from '../../context/LibraryContext'
import { formatTime } from '../../utils/format'
import { EqBars, LikeHeart, PlayIcon } from '../ui/icons'
import CoverImage from './CoverImage'

export default function SongRow({ song, index, onPlay, isCurrent = false, isPlaying = false }) {
  const { likedIds, toggleLike } = useLibrary()
  const liked = likedIds.has(song.id)

  return (
    <li
      data-testid={`song-row-${song.id}`}
      aria-current={isCurrent ? 'true' : undefined}
      style={{ animationDelay: `${Math.min(index, 12) * 30}ms` }}
      className={`group flex items-center gap-1 rounded-xl pr-1 transition-colors duration-200 motion-safe:animate-rise sm:gap-3 sm:pr-3 ${
        isCurrent ? 'bg-emerald-500/[0.07] ring-1 ring-emerald-500/15' : 'hover:bg-white/[0.04]'
      }`}
    >
      <button
        onClick={() => onPlay(song)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-2 pl-2 text-left outline-none transition-transform duration-150 focus-visible:ring-2 focus-visible:ring-emerald-500/60 active:scale-[0.99] sm:gap-4 sm:pl-3"
      >
        <span aria-hidden="true" className="flex w-6 shrink-0 justify-end text-sm text-neutral-500 tabular-nums">
          {isCurrent ? (
            <EqBars playing={isPlaying} />
          ) : (
            <>
              <span className="group-hover:hidden">{index + 1}</span>
              <PlayIcon className="hidden h-3.5 w-3.5 text-white group-hover:block motion-safe:group-hover:animate-pop-in" />
            </>
          )}
        </span>
        <CoverImage
          decorative
          src={song.cover_url}
          className="h-10 w-10 shrink-0 rounded-md shadow-md shadow-black/40 ring-1 ring-white/5 transition-transform duration-200 group-hover:scale-105"
        />
        <span className="min-w-0">
          <p
            className={`truncate font-medium transition-colors ${isCurrent ? 'text-emerald-400' : 'text-neutral-100 group-hover:text-white'}`}
          >
            {song.title}
          </p>
          <p className="truncate text-sm text-neutral-400">{song.artist}</p>
        </span>
      </button>
      <span className="hidden max-w-48 truncate text-sm text-neutral-500 transition-colors group-hover:text-neutral-400 md:block">
        {song.album}
      </span>
      <button
        onClick={() => toggleLike(song)}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition duration-200 hover:bg-white/5 active:scale-90 ${
          liked ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-neutral-400 hover:text-white!'
        }`}
        aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
        aria-pressed={liked}
      >
        <LikeHeart liked={liked} className="h-4.5 w-4.5" />
      </button>
      <span className="w-10 shrink-0 text-right text-sm text-neutral-500 tabular-nums sm:w-12">
        {formatTime(song.duration_seconds)}
      </span>
    </li>
  )
}
