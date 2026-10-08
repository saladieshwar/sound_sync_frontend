import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { getRoom, joinRoom, leaveRoom, transferAccess } from '../../api/rooms'
import { getSong, listSongs } from '../../api/songs'
import LeaveRoomButton from '../../components/room/LeaveRoomButton'
import ParticipantList from '../../components/room/ParticipantList'
import CoverImage from '../../components/songs/CoverImage'
import { CheckIcon, EqBars, MusicIcon, PauseIcon, PlayIcon } from '../../components/ui/icons'
import { useAuth } from '../../context/AuthContext'
import { usePlayer } from '../../context/PlayerContext'
import {
  PLAYBACK_EVENTS,
  RoomEvent,
  positionAtServerTs,
  roomErrorMessage,
  timelinePosition,
} from '../../realtime/events'
import { createServerClock } from '../../realtime/serverClock'
import { useRoomSocket } from '../../realtime/useRoomSocket'
import { formatTime } from '../../utils/format'

const COPIED_MESSAGE_MS = 2000

const SOCKET_STATUS_TEXT = {
  idle: 'Offline',
  connecting: 'Connecting…',
  open: 'Live',
  reconnecting: 'Reconnecting…',
  closed: 'Disconnected',
}

function BackToRooms() {
  return (
    <Link
      to="/room"
      className="relative text-sm font-medium text-emerald-400 underline-offset-4 transition-colors hover:text-emerald-300 hover:underline"
    >
      Back to Musical Room
    </Link>
  )
}

export default function RoomPage() {
  const { roomId: rawRoomId } = useParams()
  const roomId = rawRoomId.toUpperCase()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const player = usePlayer()
  const { currentSong, isPlaying, status: playerStatus, position, duration, syncTo, stop } = player
  const { setRoomLocked } = player

  const [room, setRoom] = useState(null)
  const [needsJoin, setNeedsJoin] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const [catalog, setCatalog] = useState([])
  const [scrub, setScrub] = useState(null)
  const [copyState, setCopyState] = useState(null)
  const [clock] = useState(createServerClock)
  const songCache = useRef(new Map())
  const lastSync = useRef(null)
  const leaving = useRef(false)

  const isController = room?.controller_user_id === user.id

  const loadRoom = useCallback(
    () =>
      getRoom(roomId)
        .then((data) => {
          setRoom(data)
          setNeedsJoin(false)
        })
        .catch((err) => {
          const e = getApiError(err)
          if (e.code === 'NOT_ROOM_PARTICIPANT') setNeedsJoin(true)
          else setLoadError(e.message)
        }),
    [roomId],
  )

  useEffect(() => {
    loadRoom()
  }, [loadRoom])

  useEffect(() => {
    listSongs()
      .then(setCatalog)
      .catch(() => setCatalog([]))
  }, [])

  useEffect(() => {
    setRoomLocked(true)
    return () => setRoomLocked(false)
  }, [setRoomLocked])

  useEffect(() => {
    if (!copyState) return undefined
    const timer = setTimeout(() => setCopyState(null), COPIED_MESSAGE_MS)
    return () => clearTimeout(timer)
  }, [copyState])

  const resolveSong = useCallback(async (songId) => {
    if (!songCache.current.has(songId)) songCache.current.set(songId, await getSong(songId))
    return songCache.current.get(songId)
  }, [])

  /** Follows the room timeline: `positionSeconds` at server time `serverTs`. */
  const applyPlayback = useCallback(
    async ({ songId, positionSeconds, playing, serverTs }) => {
      lastSync.current = { songId, positionSeconds, playing, serverTs }
      if (!songId) {
        stop() // a room with no song yet must not keep playing what was on before
        return
      }
      try {
        const song = await resolveSong(songId)
        if (lastSync.current?.serverTs !== serverTs) return // a newer event arrived meanwhile
        syncTo({ song, positionSeconds, playing, serverTs, serverNow: clock.now })
      } catch {
        setNotice(roomErrorMessage('SONG_NOT_FOUND'))
      }
    },
    [resolveSong, syncTo, stop, clock],
  )

  /** Room position right now, on the server's clock. */
  const roomPositionNow = () =>
    lastSync.current ? timelinePosition(lastSync.current, clock.now()) : position

  const exitRoom = useCallback(
    (message) => {
      stop()
      navigate('/room', message ? { state: { notice: message } } : undefined)
    },
    [stop, navigate],
  )

  const onMessage = useCallback(
    (msg) => {
      const { type, payload } = msg
      if (PLAYBACK_EVENTS.has(type)) {
        setRoom((r) => ({
          ...r,
          current_song_id: payload.song_id,
          position_seconds: payload.position_seconds,
          is_playing: payload.is_playing,
          state_updated_at: new Date(msg.server_ts).toISOString(),
        }))
        setNotice(null)
        applyPlayback({
          songId: payload.song_id,
          positionSeconds: payload.position_seconds,
          playing: payload.is_playing,
          serverTs: msg.server_ts,
        })
        return
      }
      switch (type) {
        case RoomEvent.ROOM_STATE:
          setRoom(payload)
          setOnlineIds(new Set(payload.online_user_ids ?? [user.id]))
          applyPlayback({
            songId: payload.current_song_id,
            positionSeconds: positionAtServerTs(payload, msg.server_ts),
            playing: payload.is_playing,
            serverTs: msg.server_ts,
          })
          break
        case RoomEvent.ACCESS_TRANSFER:
          setRoom((r) => ({ ...r, controller_user_id: payload.controller_user_id }))
          break
        case RoomEvent.USER_JOINED:
          setOnlineIds((prev) => new Set(prev).add(payload.user_id))
          loadRoom()
          break
        case RoomEvent.USER_LEFT:
          setOnlineIds((prev) => {
            const next = new Set(prev)
            next.delete(payload.user_id)
            return next
          })
          if (payload.reason === 'left') {
            setRoom((r) => ({
              ...r,
              controller_user_id: payload.controller_user_id ?? r.controller_user_id,
              participants: r.participants.filter((p) => p.user.id !== payload.user_id),
            }))
          }
          break
        case RoomEvent.ROOM_CLOSED:
          if (!leaving.current) exitRoom('The room was closed by its admin.')
          break
        case RoomEvent.ERROR:
          setNotice(roomErrorMessage(payload.code))
          break
        default:
          break
      }
    },
    [user.id, applyPlayback, loadRoom, exitRoom],
  )

  const onClosed = useCallback(
    (code) => {
      if (leaving.current) return
      if (code === 1000) exitRoom('You are no longer in this room.')
      else loadRoom() // 1008: membership or room status changed — let REST explain why
    },
    [exitRoom, loadRoom],
  )

  const { status: socketStatus, send } = useRoomSocket({
    roomId,
    token,
    enabled: Boolean(room) && !needsJoin,
    onMessage,
    onClosed,
    clock,
  })

  // When the song finishes, the controller tells the room so everyone shows it as paused.
  const songEnded =
    room?.is_playing && playerStatus === 'paused' && duration > 0 && position >= duration - 0.5
  useEffect(() => {
    if (isController && songEnded) send(RoomEvent.PAUSE, { position_seconds: duration })
  }, [isController, songEnded, send, duration])

  const onJoin = async () => {
    try {
      setRoom(await joinRoom(roomId))
      setNeedsJoin(false)
      setLoadError(null)
    } catch (err) {
      setLoadError(getApiError(err).message)
    }
  }

  const onLeave = async () => {
    leaving.current = true
    try {
      await leaveRoom(roomId)
    } catch {
      // Already left or room already closed — either way we are out.
    }
    exitRoom()
  }

  const onTransfer = async (targetUserId) => {
    try {
      setRoom(await transferAccess(roomId, targetUserId))
    } catch (err) {
      setNotice(getApiError(err).message)
    }
  }

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(room.join_link)
      setCopyState('copied')
    } catch {
      setCopyState('failed') // clipboard API needs https or localhost
    }
  }

  // Controller actions go to RT; local playback only changes when the broadcast comes back.
  const sendOrWarn = (type, payload) => {
    if (!send(type, payload)) setNotice('Not connected to the room yet. Please try again.')
  }
  const playInRoom = (song) =>
    sendOrWarn(RoomEvent.SONG_CHANGE, { song_id: song.id, position_seconds: 0 })
  const togglePlayInRoom = () => {
    const at = Math.max(0, Math.min(roomPositionNow(), duration || Infinity))
    sendOrWarn(room.is_playing ? RoomEvent.PAUSE : RoomEvent.PLAY, { position_seconds: at })
  }
  const commitSeek = () => {
    if (scrub === null) return
    sendOrWarn(RoomEvent.SEEK, { position_seconds: scrub })
    setScrub(null)
  }

  // Browsers block audio until the user interacts with the page; offer a one-tap resync.
  const audioBlocked =
    Boolean(room?.is_playing && room.current_song_id) &&
    !isPlaying &&
    playerStatus !== 'loading' &&
    !songEnded
  const unlockAudio = () => {
    if (lastSync.current) applyPlayback({ ...lastSync.current })
  }

  if (needsJoin) {
    return (
      <div className="relative mx-auto mt-10 flex max-w-md flex-col items-center gap-4 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/60 px-6 py-10 text-center shadow-2xl shadow-black/40 motion-safe:animate-rise">
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/30">
          <MusicIcon className="h-6 w-6" />
        </span>
        <h1 className="relative text-2xl font-bold tracking-tight text-white">You've been invited to room {roomId}</h1>
        <p className="relative text-neutral-400">Join to listen along in sync with everyone in the room.</p>
        {loadError && <p className="relative text-sm text-red-300">{loadError}</p>}
        <button
          data-testid="room-join-confirm"
          onClick={onJoin}
          className="relative rounded-full bg-linear-to-r from-emerald-400 to-emerald-500 px-8 py-3 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition duration-200 hover:-translate-y-px hover:shadow-emerald-500/40 active:translate-y-0 active:scale-95"
        >
          Join Room
        </button>
        <BackToRooms />
      </div>
    )
  }

  if (!room) {
    if (!loadError) {
      return (
        <div className="flex flex-col items-center gap-4 pt-20">
          <span aria-hidden="true" className="h-8 w-8 rounded-full border-2 border-neutral-800 border-t-emerald-400 motion-safe:animate-spin" />
          <p className="text-sm text-neutral-400">Loading room…</p>
        </div>
      )
    }
    return (
      <div className="mx-auto mt-10 flex max-w-md flex-col items-center gap-4 rounded-3xl border border-red-500/15 bg-neutral-900/60 px-6 py-10 text-center shadow-2xl shadow-black/40 motion-safe:animate-rise">
        <p role="alert" className="text-red-300">
          {loadError}
        </p>
        <BackToRooms />
      </div>
    )
  }

  const controller = room.participants.find((p) => p.user.id === room.controller_user_id)?.user
  const shownPosition = scrub ?? position
  const live = socketStatus === 'open'
  const canControl = isController && Boolean(room.current_song_id)

  return (
    <div className="mx-auto grid max-w-7xl min-[1800px]:max-w-400 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
      <div className="min-w-0">
        <header className="relative mb-6 overflow-hidden rounded-3xl border border-white/5 bg-neutral-900/60 p-5 shadow-2xl shadow-black/30 motion-safe:animate-rise sm:p-7">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />
          <div className="relative flex flex-col-reverse items-start gap-4 sm:flex-row">
            <div className="w-full min-w-0 flex-1">
              <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-emerald-300/90 uppercase">Listening together</p>
              <h1 className="text-2xl font-bold tracking-tight break-words text-white sm:text-3xl">{room.name}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                <span className="flex items-center gap-2 rounded-full border border-white/10 bg-neutral-950/50 px-3 py-1 whitespace-nowrap">
                  Room ID
                  <span data-testid="room-id" className="font-mono font-semibold tracking-wider text-white">
                    {room.id}
                  </span>
                </span>
                <span
                  className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
                    live ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {live && <span className="absolute inset-0 rounded-full bg-emerald-400 opacity-60 motion-safe:animate-ping" />}
                    <span className={`relative h-2 w-2 rounded-full ${live ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                  </span>
                  <span data-testid="socket-status">{SOCKET_STATUS_TEXT[socketStatus]}</span>
                </span>
              </div>
            </div>
            <LeaveRoomButton onLeave={onLeave} />
          </div>

          <div className="relative mt-5 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 basis-full sm:basis-auto sm:flex-1">
              <LinkIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500" />
              <input
                data-testid="room-join-link"
                aria-label="Join link"
                readOnly
                value={room.join_link}
                onFocus={(e) => e.target.select()}
                className="w-full rounded-xl border border-white/10 bg-neutral-950/60 py-2.5 pr-3 pl-10 font-mono text-sm text-neutral-300 outline-none transition focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/15"
              />
            </div>
            <button
              data-testid="room-copy-link"
              onClick={copyLink}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium transition duration-200 active:scale-95 ${
                copyState === 'copied'
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
                  : 'bg-white text-neutral-950 shadow-lg shadow-black/30 hover:bg-neutral-200'
              }`}
            >
              {copyState === 'copied' && <CheckIcon className="h-4 w-4 motion-safe:animate-pop-in" />}
              Copy join link
            </button>
            {copyState && (
              <span role="status" className="text-sm text-neutral-400 motion-safe:animate-rise">
                {copyState === 'copied' ? 'Copied!' : 'Copy the link above manually.'}
              </span>
            )}
          </div>
        </header>

        {notice && (
          <p
            data-testid="room-notice"
            role="alert"
            className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300 motion-safe:animate-rise"
          >
            {notice}
          </p>
        )}

        <section className="relative mb-8 overflow-hidden rounded-3xl border border-white/5 bg-linear-to-br from-neutral-900 to-neutral-900/40 p-5 shadow-2xl shadow-black/30 motion-safe:animate-rise sm:p-6">
          <div className="flex items-center gap-4 sm:gap-5">
            <CoverImage
              key={`cover-${currentSong?.id ?? 'none'}`}
              decorative
              src={currentSong?.cover_url}
              className={`h-20 w-20 shrink-0 rounded-2xl shadow-xl shadow-black/50 ring-1 transition sm:h-24 sm:w-24 ${room.is_playing ? 'ring-emerald-400/40' : 'ring-white/10'}`}
            />
            <div key={`info-${currentSong?.id ?? 'none'}`} className="min-w-0 flex-1 motion-safe:animate-fade-in">
              <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-emerald-300/90 uppercase">
                {room.is_playing && <EqBars playing className="h-3" />}
                Now playing in room
              </p>
              <h2 data-testid="room-song-title" className="mt-1 text-xl font-bold tracking-tight break-words text-white sm:text-2xl">
                {currentSong?.title ?? 'Nothing yet'}
              </h2>
              <p className="text-neutral-400">{currentSong?.artist}</p>
            </div>
          </div>
          <div className="mt-5 flex items-center gap-3 sm:gap-4">
            <button
              data-testid="room-toggle"
              aria-label={room.is_playing ? 'Pause for everyone' : 'Play for everyone'}
              disabled={!canControl}
              onClick={togglePlayInRoom}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-neutral-950 shadow-lg shadow-white/10 transition duration-200 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-35"
            >
              {room.is_playing ? (
                <PauseIcon key="pause" className="h-5 w-5 motion-safe:animate-pop-in" />
              ) : (
                <PlayIcon key="play" className="h-5 w-5 translate-x-px motion-safe:animate-pop-in" />
              )}
            </button>
            <span className="text-xs text-neutral-400 tabular-nums">{formatTime(shownPosition)}</span>
            <input
              data-testid="room-seek"
              aria-label="Seek for everyone"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(shownPosition, duration || 0)}
              disabled={!canControl}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={commitSeek}
              onKeyUp={commitSeek}
              onBlur={commitSeek}
              style={{ '--fill': `${duration > 0 ? Math.min(100, (shownPosition / duration) * 100) : 0}%` }}
              className="range min-w-0 flex-1"
            />
            <span className="text-xs text-neutral-400 tabular-nums">{formatTime(duration)}</span>
          </div>
          {audioBlocked && (
            <button
              data-testid="room-sync-audio"
              onClick={unlockAudio}
              className="mt-4 rounded-full bg-emerald-500 px-5 py-2 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition hover:bg-emerald-400 active:scale-95 motion-safe:animate-pulse"
            >
              Tap to hear the room
            </button>
          )}
          <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-4 text-xs text-neutral-400">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${isController ? 'bg-emerald-400' : 'bg-neutral-500'}`}
            />
            <p data-testid="room-controller">
              {isController
                ? 'You control playback for everyone.'
                : `${controller?.username ?? 'Someone'} controls playback. Your player stays in sync automatically.`}
            </p>
          </div>
        </section>

        {isController && (
          <section className="motion-safe:animate-rise">
            <h2 className="mb-3 text-xl font-bold tracking-tight text-white">Pick a song for the room</h2>
            <ul data-testid="room-song-picker" className="flex flex-col gap-0.5">
              {catalog.map((song) => {
                const current = currentSong?.id === song.id
                return (
                  <li key={song.id}>
                    <button
                      onClick={() => playInRoom(song)}
                      className={`group flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors duration-200 sm:px-3 ${
                        current ? 'bg-emerald-500/[0.07] ring-1 ring-emerald-500/15' : 'hover:bg-white/[0.04]'
                      }`}
                    >
                      <span className="relative shrink-0">
                        <CoverImage decorative src={song.cover_url} className="h-10 w-10 rounded-md shadow-md shadow-black/40 ring-1 ring-white/5" />
                        <span
                          aria-hidden="true"
                          className={`absolute inset-0 flex items-center justify-center rounded-md bg-black/50 text-white transition-opacity ${
                            current ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                        >
                          {current ? <EqBars playing={room.is_playing} /> : <PlayIcon className="h-4 w-4" />}
                        </span>
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate font-medium ${current ? 'text-emerald-400' : 'text-neutral-100'}`}>
                          {song.title}
                        </span>
                        <span className="block truncate text-sm text-neutral-400">{song.artist}</span>
                      </span>
                      <span className="shrink-0 text-sm text-neutral-500 tabular-nums">
                        {formatTime(song.duration_seconds)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>

      <aside className="lg:sticky lg:top-0 lg:self-start">
        <div className="rounded-3xl border border-white/5 bg-neutral-900/50 p-4 shadow-xl shadow-black/30 motion-safe:animate-rise sm:p-5">
          <h2 className="mb-4 flex items-center gap-2.5 text-lg font-bold tracking-tight text-white">
            Participants
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">
              {room.participants.length}
            </span>
          </h2>
          <ParticipantList room={room} currentUserId={user.id} onlineIds={onlineIds} onTransfer={onTransfer} />
        </div>
      </aside>
    </div>
  )
}

function LinkIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true" {...props}>
      <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
    </svg>
  )
}
