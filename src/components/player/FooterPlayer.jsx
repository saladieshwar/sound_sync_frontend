import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../../context/LibraryContext'
import { usePlayer } from '../../context/PlayerContext'
import { formatTime } from '../../utils/format'
import CoverImage from '../songs/CoverImage'

export default function FooterPlayer() {
  const p = usePlayer()
  const { likedIds, toggleLike } = useLibrary()
  // While the user drags the seek bar, show their value instead of the live position,
  // and only seek once on release.
  const [scrub, setScrub] = useState(null)
  const song = p.currentSong
  const disabled = !song || p.roomLocked
  const liked = song ? likedIds.has(song.id) : false
  const shownPosition = scrub ?? p.position

  const commitScrub = () => {
    if (scrub === null) return
    p.seek(scrub)
    setScrub(null)
  }

  let statusText = null
  if (p.isLoading) statusText = <span className="text-neutral-400">Loading…</span>
  else if (p.hasError) statusText = <span className="text-red-400">Can't play this song</span>

  // Phones: song info and buttons on one row, a full-width seek bar below, no volume slider
  // (hardware buttons). From md up: info | controls over seek bar | volume.
  return (
    <footer
      data-testid="footer-player"
      aria-label="Player"
      className="fixed inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-neutral-800 bg-neutral-900 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:h-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] md:gap-x-6 md:px-6 md:py-2"
    >
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 md:row-span-2">
        {song && (
          <CoverImage
            src={song.cover_url}
            label={song.album ?? song.title}
            className="h-11 w-11 shrink-0 rounded md:h-14 md:w-14"
          />
        )}
        <div className="min-w-0">
          <Link
            to="/now-playing"
            data-testid="player-title"
            className="block truncate font-medium hover:underline"
          >
            {song?.title ?? 'Nothing playing'}
          </Link>
          <p className="truncate text-sm text-neutral-400">{song?.artist}</p>
          {statusText && (
            <p data-testid="player-status" role="status" className="truncate text-xs">
              {statusText}
            </p>
          )}
          {p.roomLocked && <p className="truncate text-xs text-amber-400">Room controlled</p>}
        </div>
        {song && (
          <button
            data-testid="player-like"
            onClick={() => toggleLike(song)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center ${liked ? 'text-emerald-400' : 'text-neutral-400'}`}
            aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
            aria-pressed={liked}
          >
            ♥
          </button>
        )}
      </div>

      <div className="col-start-2 row-start-1 flex items-center gap-1 md:gap-3 md:justify-self-center">
        <button
          data-testid="player-prev"
          aria-label="Previous"
          disabled={disabled}
          onClick={p.previous}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
        >
          ⏮
        </button>
        <button
          data-testid="player-toggle"
          aria-label={p.isPlaying ? 'Pause' : 'Play'}
          disabled={disabled}
          onClick={p.togglePlay}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
        >
          {p.isPlaying ? '❚❚' : '▶'}
        </button>
        <button
          data-testid="player-next"
          aria-label="Next"
          disabled={disabled || !p.hasNext}
          onClick={p.next}
          className="flex h-10 w-10 items-center justify-center disabled:opacity-40"
        >
          ⏭
        </button>
      </div>

      <div className="col-span-2 row-start-2 flex w-full items-center gap-2 text-xs text-neutral-400 md:col-span-1 md:col-start-2 md:max-w-xl md:justify-self-center">
        <span data-testid="player-position" className="min-w-10 text-right tabular-nums">
          {formatTime(shownPosition)}
        </span>
        <input
          data-testid="player-seek"
          aria-label="Seek"
          type="range"
          min={0}
          max={p.duration || 0}
          step={0.1}
          value={Math.min(shownPosition, p.duration || 0)}
          disabled={disabled}
          onChange={(e) => setScrub(Number(e.target.value))}
          onPointerUp={commitScrub}
          onKeyUp={commitScrub}
          onBlur={commitScrub}
          className="h-6 min-w-0 flex-1 cursor-pointer accent-emerald-500 disabled:cursor-default"
        />
        <span data-testid="player-duration" className="min-w-10 tabular-nums">
          {formatTime(p.duration)}
        </span>
      </div>

      <div className="hidden items-center justify-end gap-2 md:col-start-3 md:row-span-2 md:row-start-1 md:flex">
        <button
          data-testid="player-mute"
          aria-label={p.muted ? 'Unmute' : 'Mute'}
          aria-pressed={p.muted}
          onClick={p.toggleMute}
          className="flex h-10 w-10 items-center justify-center text-neutral-300"
        >
          {p.muted || p.volume === 0 ? '🔇' : '🔊'}
        </button>
        <input
          data-testid="player-volume"
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p.muted ? 0 : p.volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          className="h-6 w-20 cursor-pointer accent-emerald-500 lg:w-28"
        />
      </div>
    </footer>
  )
}
