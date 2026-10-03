import { mediaUrl } from '../config'
import { usePlayer } from '../context/PlayerContext'
import SongList from '../components/songs/SongList'

export default function NowPlayingPage() {
  const { currentSong, queue } = usePlayer()

  if (!currentSong) return <p className="text-neutral-400">Nothing is playing yet.</p>

  return (
    <div className="flex flex-col gap-10 md:flex-row">
      <div className="flex flex-col items-center gap-4 md:w-1/3">
        <div className="aspect-square w-full max-w-sm overflow-hidden rounded-xl bg-neutral-800">
          {currentSong.cover_url && (
            <img src={mediaUrl(currentSong.cover_url)} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold">{currentSong.title}</h1>
          <p className="text-neutral-400">{currentSong.artist}</p>
          {currentSong.album && <p className="text-sm text-neutral-500">{currentSong.album}</p>}
        </div>
      </div>
      <section className="flex-1">
        <h2 className="mb-3 text-lg font-semibold">Up Next</h2>
        <SongList songs={queue} />
      </section>
    </div>
  )
}
