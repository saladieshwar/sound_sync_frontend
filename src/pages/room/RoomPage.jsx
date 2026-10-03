import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { getRoom, joinRoom, leaveRoom, transferAccess } from '../../api/rooms'
import { getSong, listSongs } from '../../api/songs'
import LeaveRoomButton from '../../components/room/LeaveRoomButton'
import ParticipantList from '../../components/room/ParticipantList'
import { useAuth } from '../../context/AuthContext'
import { usePlayer } from '../../context/PlayerContext'
import { RoomEvent, reconcilePosition } from '../../realtime/events'
import { useRoomSocket } from '../../realtime/useRoomSocket'
import { formatTime } from '../../utils/format'

export default function RoomPage() {
  const { roomId: rawRoomId } = useParams()
  const roomId = rawRoomId.toUpperCase()
  const navigate = useNavigate()
  const { user, token } = useAuth()
  const { currentSong, isPlaying, position, duration, syncTo, setRoomLocked } = usePlayer()

  const [room, setRoom] = useState(null)
  const [needsJoin, setNeedsJoin] = useState(false)
  const [error, setError] = useState(null)
  const [onlineIds, setOnlineIds] = useState(() => new Set())
  const [catalog, setCatalog] = useState([])
  const roomRef = useRef(null)
  const songCache = useRef(new Map())

  useEffect(() => {
    roomRef.current = room
  }, [room])

  const isController = room?.controller_user_id === user.id

  const loadRoom = useCallback(() => getRoom(roomId).then(setRoom), [roomId])

  useEffect(() => {
    loadRoom().catch((err) => {
      const e = getApiError(err)
      if (e.code === 'NOT_ROOM_PARTICIPANT') setNeedsJoin(true)
      else setError(e.message)
    })
  }, [loadRoom])

  useEffect(() => {
    listSongs().then(setCatalog)
  }, [])

  useEffect(() => {
    setRoomLocked(true)
    return () => setRoomLocked(false)
  }, [setRoomLocked])

  const resolveSong = useCallback(async (songId) => {
    if (!songCache.current.has(songId)) songCache.current.set(songId, await getSong(songId))
    return songCache.current.get(songId)
  }, [])

  const applyPlayback = useCallback(
    async (songId, positionSeconds, playing, serverTs) => {
      if (!songId) return
      const song = await resolveSong(songId)
      syncTo({ song, positionSeconds: reconcilePosition(positionSeconds, serverTs, playing), playing })
    },
    [resolveSong, syncTo],
  )

  const onMessage = useCallback(
    (msg) => {
      const { type, payload } = msg
      switch (type) {
        case RoomEvent.ROOM_STATE:
          setRoom(payload)
          setOnlineIds((prev) => new Set(prev).add(user.id))
          applyPlayback(
            payload.current_song_id,
            payload.position_seconds,
            payload.is_playing,
            Date.parse(payload.state_updated_at),
          )
          break
        case RoomEvent.PLAY:
        case RoomEvent.PAUSE:
        case RoomEvent.SEEK:
        case RoomEvent.SONG_CHANGE: {
          const prev = roomRef.current
          const playing =
            type === RoomEvent.PAUSE ? false : type === RoomEvent.SEEK ? prev?.is_playing : true
          const songId = payload.song_id ?? prev?.current_song_id
          setRoom((r) => ({
            ...r,
            is_playing: playing,
            current_song_id: songId,
            position_seconds: payload.position_seconds,
          }))
          applyPlayback(songId, payload.position_seconds, playing, msg.server_ts)
          break
        }
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
          if (payload.reason === 'left') loadRoom()
          break
        case RoomEvent.ROOM_CLOSED:
          syncTo({ song: null, positionSeconds: 0, playing: false })
          navigate('/room', { state: { notice: 'The room was closed by its admin.' } })
          break
        case RoomEvent.ERROR:
          setError(payload.code)
          break
        default:
          break
      }
    },
    [user.id, applyPlayback, loadRoom, syncTo, navigate],
  )

  const { status, send } = useRoomSocket({
    roomId,
    token,
    enabled: Boolean(room) && !needsJoin,
    onMessage,
  })

  const onJoin = async () => {
    try {
      setRoom(await joinRoom(roomId))
      setNeedsJoin(false)
    } catch (err) {
      setError(getApiError(err).message)
    }
  }

  const onLeave = async () => {
    try {
      await leaveRoom(roomId)
    } finally {
      syncTo({ song: null, positionSeconds: position, playing: false })
      navigate('/room')
    }
  }

  const onTransfer = async (targetUserId) => {
    try {
      setRoom(await transferAccess(roomId, targetUserId))
    } catch (err) {
      setError(getApiError(err).message)
    }
  }

  // Controller actions are sent to RT; local playback only changes when the broadcast comes back.
  const playInRoom = (song) => send(RoomEvent.SONG_CHANGE, { song_id: song.id, position_seconds: 0 })
  const togglePlayInRoom = () =>
    send(isPlaying ? RoomEvent.PAUSE : RoomEvent.PLAY, {
      song_id: room.current_song_id,
      position_seconds: position,
    })
  const seekInRoom = (seconds) =>
    send(RoomEvent.SEEK, { song_id: room.current_song_id, position_seconds: seconds })

  if (needsJoin) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center">
        <h1 className="text-2xl font-bold">You've been invited to room {roomId}</h1>
        {error && <p className="text-red-400">{error}</p>}
        <button
          data-testid="room-join-confirm"
          onClick={onJoin}
          className="rounded-md bg-emerald-500 px-6 py-2 font-semibold text-black hover:bg-emerald-400"
        >
          Join Room
        </button>
      </div>
    )
  }

  if (!room) return <p className="text-neutral-400">{error ?? 'Loading room…'}</p>

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div>
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold">{room.name}</h1>
            <p className="text-sm text-neutral-400">
              Room ID <span className="font-mono text-neutral-200">{room.id}</span> · socket {status}
            </p>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(room.join_link)}
            className="rounded-md bg-neutral-800 px-3 py-2 text-sm hover:bg-neutral-700"
          >
            Copy join link
          </button>
          <div className="ml-auto">
            <LeaveRoomButton onLeave={onLeave} />
          </div>
        </div>

        {error && <p className="mb-4 rounded bg-red-500/10 px-4 py-2 text-red-300">{error}</p>}

        <section className="mb-8 rounded-xl bg-neutral-900 p-6">
          <p className="text-sm text-neutral-400">Now playing in room</p>
          <h2 className="text-xl font-semibold">{currentSong?.title ?? 'Nothing yet'}</h2>
          <p className="mb-4 text-neutral-400">{currentSong?.artist}</p>
          <div className="flex items-center gap-4">
            <button
              data-testid="room-toggle"
              disabled={!isController || !room.current_song_id}
              onClick={togglePlayInRoom}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
            >
              {isPlaying ? '❚❚' : '▶'}
            </button>
            <span className="text-xs text-neutral-400">{formatTime(position)}</span>
            <input
              data-testid="room-seek"
              type="range"
              min={0}
              max={duration || 0}
              step={0.1}
              value={position}
              disabled={!isController}
              onChange={(e) => seekInRoom(Number(e.target.value))}
              className="flex-1 accent-emerald-500"
            />
            <span className="text-xs text-neutral-400">{formatTime(duration)}</span>
          </div>
          {!isController && (
            <p className="mt-3 text-xs text-amber-400">Only the current controller can change playback.</p>
          )}
        </section>

        {isController && (
          <section>
            <h2 className="mb-3 text-lg font-semibold">Pick a song for the room</h2>
            <ul className="flex flex-col">
              {catalog.map((song) => (
                <li key={song.id}>
                  <button
                    onClick={() => playInRoom(song)}
                    className="flex w-full justify-between rounded px-3 py-2 text-left hover:bg-neutral-800"
                  >
                    <span>
                      {song.title} <span className="text-neutral-500">· {song.artist}</span>
                    </span>
                    <span className="text-sm text-neutral-500">{formatTime(song.duration_seconds)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <aside>
        <h2 className="mb-3 text-lg font-semibold">Participants</h2>
        <ParticipantList
          room={room}
          currentUserId={user.id}
          onlineIds={onlineIds}
          onTransfer={onTransfer}
        />
      </aside>
    </div>
  )
}
