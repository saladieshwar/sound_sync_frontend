import { usePlayer } from '../../context/PlayerContext'
import LoadError from './LoadError'
import SongRow from './SongRow'

export default function SongList({
  songs = [],
  onPlay,
  loading = false,
  error = null,
  onRetry,
  emptyMessage = 'No songs found.',
}) {
  const { playSong } = usePlayer()
  const handlePlay = onPlay ?? ((song) => playSong(song, songs))

  if (loading) return <p className="text-sm text-neutral-500">Loading songs…</p>
  if (error) return <LoadError error={error} onRetry={onRetry} />
  if (!songs.length) return <p className="text-sm text-neutral-500">{emptyMessage}</p>
  return (
    <ul className="flex flex-col">
      {songs.map((song, i) => (
        <SongRow key={song.id} song={song} index={i} onPlay={handlePlay} />
      ))}
    </ul>
  )
}
