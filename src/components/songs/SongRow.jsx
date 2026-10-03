import { useLibrary } from '../../context/LibraryContext'
import { formatTime } from '../../utils/format'

export default function SongRow({ song, index, onPlay }) {
  const { likedIds, toggleLike } = useLibrary()

  return (
    <li
      data-testid={`song-row-${song.id}`}
      className="group flex items-center gap-4 rounded px-3 py-2 hover:bg-neutral-800"
    >
      <span className="w-6 text-right text-sm text-neutral-500">{index + 1}</span>
      <button onClick={() => onPlay(song)} className="min-w-0 flex-1 text-left">
        <p className="truncate font-medium">{song.title}</p>
        <p className="truncate text-sm text-neutral-400">{song.artist}</p>
      </button>
      <span className="hidden text-sm text-neutral-500 md:block">{song.album}</span>
      <button
        onClick={() => toggleLike(song)}
        className={likedIds.has(song.id) ? 'text-emerald-400' : 'text-neutral-600 group-hover:text-neutral-400'}
        aria-label="Like"
      >
        ♥
      </button>
      <span className="w-12 text-right text-sm text-neutral-500">
        {formatTime(song.duration_seconds)}
      </span>
    </li>
  )
}
