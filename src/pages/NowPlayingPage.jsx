import { Link } from 'react-router-dom'
import { useLibrary } from '../context/LibraryContext'
import { usePlayer } from '../context/PlayerContext'
import CoverImage from '../components/songs/CoverImage'
import SongList from '../components/songs/SongList'
import { EqBars, MusicIcon } from '../components/ui/icons'
import useLikePop from '../components/ui/useLikePop'
import { formatTime } from '../utils/format'

export default function NowPlayingPage() {
  const { currentSong, queue, isPlaying, isLoading, hasError } = usePlayer()
  const { likedIds, toggleLike } = useLibrary()
  const liked = currentSong ? likedIds.has(currentSong.id) : false
  const pops = useLikePop(liked, currentSong?.id)

  if (!currentSong) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center motion-safe:animate-rise">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-neutral-900 text-neutral-500 shadow-xl shadow-black/40">
          <MusicIcon className="h-7 w-7" />
        </span>
        <p className="text-neutral-400">Nothing is playing yet.</p>
        <Link
          to="/"
          className="rounded-full bg-white/5 px-5 py-2 text-sm font-medium text-white ring-1 ring-white/10 transition hover:bg-white/10"
        >
          Browse songs
        </Link>
      </div>
    )
  }

  let state = 'Paused'
  if (isLoading) state = 'Loading…'
  else if (hasError) state = "Can't play this song"
  else if (isPlaying) state = 'Now playing'

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:gap-10">
      <div className="relative flex flex-col items-center gap-6 md:sticky md:top-0 md:w-1/3 md:self-start">
        <div className="relative w-full max-w-64 sm:max-w-sm">
          <CoverImage
            decorative
            src={currentSong.cover_url}
            className="absolute inset-0 aspect-square w-full scale-95 rounded-3xl opacity-60 blur-2xl"
          />
          <CoverImage
            key={currentSong.id}
            src={currentSong.cover_url}
            label={currentSong.album ?? currentSong.title}
            className={`relative aspect-square w-full rounded-3xl shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-transform duration-500 motion-safe:animate-rise ${isPlaying ? 'scale-100' : 'scale-[0.97]'}`}
          />
        </div>
        <div className="w-full min-w-0 text-center break-words">
          <p
            data-testid="now-playing-state"
            className={`mb-2 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
              hasError ? 'bg-red-500/10 text-red-300' : 'bg-emerald-500/10 text-emerald-300'
            }`}
          >
            {isPlaying && <EqBars playing className="h-3" />}
            {state}
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">{currentSong.title}</h1>
          <p className="mt-1 text-neutral-300">{currentSong.artist}</p>
          {currentSong.album && <p className="text-sm text-neutral-500">{currentSong.album}</p>}
          <p className="mt-1 text-xs text-neutral-500 capitalize">
            {currentSong.category} · {formatTime(currentSong.duration_seconds)}
          </p>
          <button
            onClick={() => toggleLike(currentSong)}
            aria-label={liked ? `Unlike ${currentSong.title}` : `Like ${currentSong.title}`}
            aria-pressed={liked}
            className={`mt-4 rounded-full border px-5 py-1.5 text-sm font-medium transition duration-200 active:scale-95 ${
              liked
                ? 'border-emerald-400/60 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15'
                : 'border-white/15 text-neutral-300 hover:border-white/30 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span key={pops} className={`inline-block ${liked && pops > 0 ? 'motion-safe:animate-like-pop' : ''}`}>
              {liked ? '♥ Liked' : '♡ Like'}
            </span>
          </button>
        </div>
      </div>
      <section
        className="min-w-0 flex-1 rounded-2xl border border-white/5 bg-neutral-900/40 p-3 shadow-xl shadow-black/20 motion-safe:animate-rise sm:p-4"
        aria-label="Up Next"
      >
        <div className="mb-3 flex items-center gap-2.5 px-1">
          <h2 className="text-xl font-bold tracking-tight text-white">Up Next</h2>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">
            {queue.length}
          </span>
        </div>
        <SongList songs={queue} />
      </section>
    </div>
  )
}
