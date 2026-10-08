import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLibrary } from '../../context/LibraryContext'
import { usePlayer } from '../../context/PlayerContext'
import { formatTime } from '../../utils/format'
import CoverImage from '../songs/CoverImage'
import { LikeHeart, MusicIcon, NextIcon, PauseIcon, PlayIcon, PrevIcon, VolumeIcon } from '../ui/icons'

const skipClass =
  'group flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 transition duration-200 hover:bg-white/5 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-35'

const percent = (value, max) => `${max > 0 ? Math.min(100, (value / max) * 100) : 0}%`

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
  const shownVolume = p.muted ? 0 : p.volume

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
      className="fixed inset-x-0 bottom-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 border-t border-white/5 bg-neutral-900/85 px-4 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-[0_-12px_40px_rgb(0_0_0/0.45)] backdrop-blur-xl md:h-24 md:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)_auto] md:gap-x-6 md:px-6 md:py-2"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/40 to-transparent"
      />
      <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-3 md:row-span-2">
        {song ? (
          <CoverImage
            key={song.id}
            src={song.cover_url}
            label={song.album ?? song.title}
            className={`h-11 w-11 shrink-0 rounded-md shadow-lg shadow-black/50 ring-1 ring-white/10 motion-safe:animate-rise md:h-14 md:w-14 [&_span]:text-xl ${p.isPlaying ? 'ring-emerald-400/40' : ''}`}
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-dashed border-neutral-700 text-neutral-600 md:h-14 md:w-14"
          >
            <MusicIcon className="h-5 w-5" />
          </span>
        )}
        <div key={song?.id ?? 'empty'} className="min-w-0 motion-safe:animate-fade-in">
          <Link
            to="/now-playing"
            data-testid="player-title"
            className={`block truncate font-semibold transition-colors hover:text-emerald-300 ${song ? 'text-white' : 'text-neutral-400'}`}
          >
            {song?.title ?? 'Nothing playing'}
          </Link>
          <p className="truncate text-sm text-neutral-400">{song?.artist}</p>
          {statusText && (
            <p data-testid="player-status" role="status" className="truncate text-xs">
              {statusText}
            </p>
          )}
          {p.roomLocked && (
            <p className="flex items-center gap-1.5 truncate text-xs font-medium text-amber-400">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
              Room controlled
            </p>
          )}
        </div>
        {song && (
          <button
            data-testid="player-like"
            onClick={() => toggleLike(song)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition duration-200 hover:bg-white/5 active:scale-90 ${liked ? 'text-emerald-400' : 'text-neutral-400 hover:text-white'}`}
            aria-label={liked ? `Unlike ${song.title}` : `Like ${song.title}`}
            aria-pressed={liked}
          >
            <LikeHeart songId={song.id} liked={liked} className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="col-start-2 row-start-1 flex items-center gap-1 md:gap-3 md:justify-self-center">
        <button data-testid="player-prev" aria-label="Previous" disabled={disabled} onClick={p.previous} className={skipClass}>
          <PrevIcon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
        </button>
        <button
          data-testid="player-toggle"
          aria-label={p.isPlaying ? 'Pause' : 'Play'}
          disabled={disabled}
          onClick={p.togglePlay}
          className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white text-neutral-950 shadow-lg shadow-white/10 transition duration-200 hover:scale-105 hover:bg-emerald-50 hover:shadow-emerald-400/20 active:scale-90 disabled:pointer-events-none disabled:opacity-35 md:h-11 md:w-11"
        >
          {p.isPlaying ? (
            <PauseIcon key="pause" className="h-5 w-5 motion-safe:animate-pop-in" />
          ) : (
            <PlayIcon key="play" className="h-5 w-5 translate-x-px motion-safe:animate-pop-in" />
          )}
          {p.isLoading && (
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full border-2 border-transparent border-t-emerald-400 motion-safe:animate-spin"
            />
          )}
        </button>
        <button
          data-testid="player-next"
          aria-label="Next"
          disabled={disabled || !p.hasNext}
          onClick={p.next}
          className={skipClass}
        >
          <NextIcon className="h-4.5 w-4.5 transition-transform duration-200 group-hover:translate-x-0.5" />
        </button>
      </div>

      <div className="col-span-2 row-start-2 flex w-full items-center gap-2.5 text-xs text-neutral-400 md:col-span-1 md:col-start-2 md:max-w-xl md:justify-self-center">
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
          style={{ '--fill': percent(shownPosition, p.duration) }}
          className="range min-w-0 flex-1"
        />
        <span data-testid="player-duration" className="min-w-10 tabular-nums">
          {formatTime(p.duration)}
        </span>
      </div>

      <div className="hidden items-center justify-end gap-1.5 md:col-start-3 md:row-span-2 md:row-start-1 md:flex">
        <button
          data-testid="player-mute"
          aria-label={p.muted ? 'Unmute' : 'Mute'}
          aria-pressed={p.muted}
          onClick={p.toggleMute}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-300 transition duration-200 hover:bg-white/5 hover:text-white active:scale-90"
        >
          <VolumeIcon
            key={String(p.muted || p.volume === 0)}
            muted={p.muted || p.volume === 0}
            className="h-5 w-5 motion-safe:animate-pop-in"
          />
        </button>
        <input
          data-testid="player-volume"
          aria-label="Volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={shownVolume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          style={{ '--fill': percent(shownVolume, 1) }}
          className="range w-20 lg:w-28"
        />
      </div>
    </footer>
  )
}
