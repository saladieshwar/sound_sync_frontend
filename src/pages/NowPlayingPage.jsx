import { useLibrary } from '../context/LibraryContext'
import { usePlayer } from '../context/PlayerContext'
import CoverImage from '../components/songs/CoverImage'
import SongList from '../components/songs/SongList'
import { formatTime } from '../utils/format'

export default function NowPlayingPage() {
  const { currentSong, queue, isPlaying, isLoading, hasError } = usePlayer()
  const { likedIds, toggleLike } = useLibrary()

  if (!currentSong) return <p className="text-neutral-400">Nothing is playing yet.</p>

  const liked = likedIds.has(currentSong.id)
  let state = 'Paused'
  if (isLoading) state = 'Loading…'
  else if (hasError) state = "Can't play this song"
  else if (isPlaying) state = 'Now playing'

  return (
    <div className="flex flex-col gap-8 md:flex-row md:gap-10">
      <div className="flex flex-col items-center gap-4 md:w-1/3">
        <CoverImage
          src={currentSong.cover_url}
          label={currentSong.album ?? currentSong.title}
          className="aspect-square w-full max-w-64 rounded-xl sm:max-w-sm"
        />
        <div className="w-full min-w-0 text-center break-words">
          <p data-testid="now-playing-state" className="text-xs uppercase tracking-wide text-emerald-400">
            {state}
          </p>
          <h1 className="text-2xl font-bold">{currentSong.title}</h1>
          <p className="text-neutral-400">{currentSong.artist}</p>
          {currentSong.album && <p className="text-sm text-neutral-500">{currentSong.album}</p>}
          <p className="mt-1 text-xs capitalize text-neutral-500">
            {currentSong.category} · {formatTime(currentSong.duration_seconds)}
          </p>
          <button
            onClick={() => toggleLike(currentSong)}
            aria-label={liked ? `Unlike ${currentSong.title}` : `Like ${currentSong.title}`}
            aria-pressed={liked}
            className={`mt-3 rounded-full border px-4 py-1 text-sm ${
              liked ? 'border-emerald-400 text-emerald-400' : 'border-neutral-600 text-neutral-300'
            }`}
          >
            {liked ? '♥ Liked' : '♡ Like'}
          </button>
        </div>
      </div>
      <section className="min-w-0 flex-1" aria-label="Up Next">
        <h2 className="mb-3 text-lg font-semibold">Up Next</h2>
        <SongList songs={queue} />
      </section>
    </div>
  )
}
