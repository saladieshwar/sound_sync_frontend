import { Link } from 'react-router-dom'
import { useLibrary } from '../../context/LibraryContext'
import { usePlayer } from '../../context/PlayerContext'
import { formatTime } from '../../utils/format'
import CoverImage from '../songs/CoverImage'

export default function FooterPlayer() {
  const p = usePlayer()
  const { likedIds, toggleLike } = useLibrary()
  const song = p.currentSong
  const disabled = !song || p.roomLocked

  return (
    <footer
      data-testid="footer-player"
      className="fixed inset-x-0 bottom-0 flex h-24 items-center gap-6 border-t border-neutral-800 bg-neutral-900 px-6"
    >
      <div className="flex w-1/4 min-w-0 items-center gap-3">
        {song && (
          <CoverImage src={song.cover_url} label={song.album ?? song.title} className="h-14 w-14 shrink-0 rounded" />
        )}
        <div className="min-w-0">
          <Link to="/now-playing" className="block truncate font-medium hover:underline">
            {song?.title ?? 'Nothing playing'}
          </Link>
          <p className="truncate text-sm text-neutral-400">{song?.artist}</p>
        </div>
        {song && (
          <button
            data-testid="player-like"
            onClick={() => toggleLike(song)}
            className={likedIds.has(song.id) ? 'text-emerald-400' : 'text-neutral-400'}
            aria-label={likedIds.has(song.id) ? `Unlike ${song.title}` : `Like ${song.title}`}
            aria-pressed={likedIds.has(song.id)}
          >
            ♥
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center gap-2">
        <div className="flex items-center gap-4">
          <button data-testid="player-prev" disabled={disabled} onClick={p.previous} className="disabled:opacity-40">
            ⏮
          </button>
          <button
            data-testid="player-toggle"
            disabled={disabled}
            onClick={p.togglePlay}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
          >
            {p.isPlaying ? '❚❚' : '▶'}
          </button>
          <button data-testid="player-next" disabled={disabled} onClick={p.next} className="disabled:opacity-40">
            ⏭
          </button>
        </div>
        <div className="flex w-full max-w-xl items-center gap-2 text-xs text-neutral-400">
          <span>{formatTime(p.position)}</span>
          <input
            data-testid="player-seek"
            type="range"
            min={0}
            max={p.duration || 0}
            step={0.1}
            value={p.position}
            disabled={disabled}
            onChange={(e) => p.seek(Number(e.target.value))}
            className="flex-1 accent-emerald-500"
          />
          <span>{formatTime(p.duration)}</span>
        </div>
      </div>

      <div className="flex w-1/4 items-center justify-end gap-2">
        {p.roomLocked && <span className="text-xs text-amber-400">Room controlled</span>}
        <button data-testid="player-mute" onClick={p.toggleMute} className="text-neutral-300">
          {p.muted || p.volume === 0 ? '🔇' : '🔊'}
        </button>
        <input
          data-testid="player-volume"
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={p.muted ? 0 : p.volume}
          onChange={(e) => p.setVolume(Number(e.target.value))}
          className="w-28 accent-emerald-500"
        />
      </div>
    </footer>
  )
}
