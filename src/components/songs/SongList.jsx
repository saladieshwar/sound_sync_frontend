import { usePlayer } from '../../context/PlayerContext'
import SongRow from './SongRow'

export default function SongList({ songs, onPlay }) {
  const { playSong } = usePlayer()
  const handlePlay = onPlay ?? ((song) => playSong(song, songs))

  if (!songs.length) return <p className="text-sm text-neutral-500">No songs found.</p>
  return (
    <ul className="flex flex-col">
      {songs.map((song, i) => (
        <SongRow key={song.id} song={song} index={i} onPlay={handlePlay} />
      ))}
    </ul>
  )
}
