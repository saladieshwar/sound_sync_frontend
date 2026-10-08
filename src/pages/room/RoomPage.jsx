import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { getRoom, joinRoom, leaveRoom, transferAccess } from '../../api/rooms'
import { getSong, listSongs } from '../../api/songs'
import LeaveRoomButton from '../../components/room/LeaveRoomButton'
import ParticipantList from '../../components/room/ParticipantList'
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
    <Link to="/room" className="text-emerald-400 hover:underline">
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
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
        <h1 className="text-2xl font-bold">You've been invited to room {roomId}</h1>
        <p className="text-neutral-400">Join to listen along in sync with everyone in the room.</p>
        {loadError && <p className="text-red-400">{loadError}</p>}
        <button
          data-testid="room-join-confirm"
          onClick={onJoin}
          className="rounded-md bg-emerald-500 px-6 py-2 font-semibold text-black hover:bg-emerald-400"
        >
          Join Room
        </button>
        <BackToRooms />
      </div>
    )
  }

  if (!room) {
    if (!loadError) return <p className="text-neutral-400">Loading room…</p>
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
        <p role="alert" className="text-red-400">
          {loadError}
        </p>
        <BackToRooms />
      </div>
    )
  }

  const controller = room.participants.find((p) => p.user.id === room.controller_user_id)?.user
  const shownPosition = scrub ?? position

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold break-words sm:text-3xl">{room.name}</h1>
            <p className="text-sm text-neutral-400">
              Room ID{' '}
              <span data-testid="room-id" className="font-mono text-neutral-200">
                {room.id}
              </span>{' '}
              ·{' '}
              <span data-testid="socket-status" className={socketStatus === 'open' ? 'text-emerald-400' : ''}>
                {SOCKET_STATUS_TEXT[socketStatus]}
              </span>
            </p>
          </div>
          <div className="ml-auto">
            <LeaveRoomButton onLeave={onLeave} />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-2">
          <input
            data-testid="room-join-link"
            aria-label="Join link"
            readOnly
            value={room.join_link}
            onFocus={(e) => e.target.select()}
            className="min-w-0 basis-full rounded-md bg-neutral-800 px-3 py-2 font-mono text-sm text-neutral-300 sm:basis-auto sm:flex-1"
          />
          <button
            data-testid="room-copy-link"
            onClick={copyLink}
            className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Copy join link
          </button>
          {copyState && (
            <span role="status" className="text-sm text-neutral-400">
              {copyState === 'copied' ? 'Copied!' : 'Copy the link above manually.'}
            </span>
          )}
        </div>

        {notice && (
          <p data-testid="room-notice" role="alert" className="mb-4 rounded bg-red-500/10 px-4 py-2 text-red-300">
            {notice}
          </p>
        )}

        <section className="mb-8 rounded-xl bg-neutral-900 p-4 sm:p-6">
          <p className="text-sm text-neutral-400">Now playing in room</p>
          <h2 data-testid="room-song-title" className="text-xl font-semibold break-words">
            {currentSong?.title ?? 'Nothing yet'}
          </h2>
          <p className="mb-4 text-neutral-400">{currentSong?.artist}</p>
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              data-testid="room-toggle"
              aria-label={room.is_playing ? 'Pause for everyone' : 'Play for everyone'}
              disabled={!isController || !room.current_song_id}
              onClick={togglePlayInRoom}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
            >
              {room.is_playing ? '❚❚' : '▶'}
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
              disabled={!isController || !room.current_song_id}
              onChange={(e) => setScrub(Number(e.target.value))}
              onPointerUp={commitSeek}
              onKeyUp={commitSeek}
              onBlur={commitSeek}
              className="h-6 min-w-0 flex-1 cursor-pointer accent-emerald-500 disabled:cursor-default"
            />
            <span className="text-xs text-neutral-400 tabular-nums">{formatTime(duration)}</span>
          </div>
          {audioBlocked && (
            <button
              data-testid="room-sync-audio"
              onClick={unlockAudio}
              className="mt-4 rounded-md bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400"
            >
              Tap to hear the room
            </button>
          )}
          <p data-testid="room-controller" className="mt-3 text-xs text-neutral-400">
            {isController
              ? 'You control playback for everyone.'
              : `${controller?.username ?? 'Someone'} controls playback. Your player stays in sync automatically.`}
          </p>
        </section>

        {isController && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Pick a song for the room</h2>
            <ul data-testid="room-song-picker" className="flex flex-col">
              {catalog.map((song) => (
                <li key={song.id}>
                  <button
                    onClick={() => playInRoom(song)}
                    className="flex w-full items-center justify-between gap-3 rounded px-3 py-2 text-left hover:bg-neutral-800"
                  >
                    <span className="min-w-0 truncate">
                      {song.title} <span className="text-neutral-500">· {song.artist}</span>
                    </span>
                    <span className="shrink-0 text-sm text-neutral-500">
                      {formatTime(song.duration_seconds)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside>
        <h2 className="mb-3 text-lg font-semibold">
          Participants <span className="text-sm text-neutral-500">({room.participants.length})</span>
        </h2>
        <ParticipantList room={room} currentUserId={user.id} onlineIds={onlineIds} onTransfer={onTransfer} />
      </aside>
    </div>
  )
}
