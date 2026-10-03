import { useLibrary } from '../../context/LibraryContext'
import { formatTime } from '../../utils/format'

export default function SongRow({ song, index, onPlay, isCurrent = false }) {
  const { likedIds, toggleLike } = useLibrary()
  const liked = likedIds.has(song.id)

  return (
    <li
      data-testid={`song-row-${song.id}`}
      aria-current={isCurrent ? 'true' : undefined}
      className="group flex items-center gap-4 rounded px-3 py-2 hover:bg-neutral-800"
    >
      <span className="w-6 text-right text-sm text-neutral-500">{isCurrent ? '♪' : index + 1}</span>
      <button onClick={() => onPlay(song)} className="min-w-0 flex-1 text-left">
        <p className={`truncate font-medium ${isCurrent ? 'text-emerald-400' : ''}`}>{song.title}</p>
        <p className="truncate text-sm text-neutral-400">{song.artist}</p>
      </button>
      <span className="hidden text-sm text-neutral-500 md:block">{song.album}</span>
      <button
        onClick={() => toggleLike(song)}
        className={liked ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-neutral-400'}
        aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
        aria-pressed={liked}
      >
        ♥
      </button>
      <span className="w-12 text-right text-sm text-neutral-500">
        {formatTime(song.duration_seconds)}
      </span>
    </li>
  )
}
