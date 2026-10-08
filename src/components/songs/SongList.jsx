import { usePlayer } from '../../context/PlayerContext'
import { MusicIcon } from '../ui/icons'
import LoadError from './LoadError'
import SongRow from './SongRow'

function SkeletonRows({ count = 4 }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="sr-only">Loading songs…</span>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} aria-hidden="true" className="flex items-center gap-4 px-3 py-2">
          <span className="h-3 w-5 rounded shimmer" />
          <span className="h-10 w-10 rounded-md shimmer" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-2/5 rounded shimmer" />
            <span className="h-2.5 w-1/4 rounded shimmer opacity-70" />
          </span>
        </div>
      ))}
    </div>
  )
}

export default function SongList({
  songs = [],
  onPlay,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No songs found.',
}) {
  const { playSong, currentSong, isPlaying } = usePlayer()
  const handlePlay = onPlay ?? ((song) => playSong(song, songs))

  if (loading) return <SkeletonRows />
  if (error) return <LoadError error={error} onRetry={onRetry} />
  if (!songs.length) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-dashed border-neutral-800 px-4 py-5 text-sm text-neutral-500">
        <MusicIcon className="h-5 w-5 shrink-0 text-neutral-600" />
        <p>{emptyMessage}</p>
      </div>
    )
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {songs.map((song, i) => (
        <SongRow
          key={song.id}
          song={song}
          index={i}
          onPlay={handlePlay}
          isCurrent={currentSong?.id === song.id}
          isPlaying={isPlaying}
        />
      ))}
    </ul>
  )
}
