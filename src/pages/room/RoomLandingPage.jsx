import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { createRoom, joinRoom } from '../../api/rooms'

const inputClass =
  'w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500'

/** Accepts either a raw Room ID or a full join link (…/room/ABCD1234). */
const extractRoomId = (value) => value.trim().split('/').filter(Boolean).pop()?.toUpperCase()

export default function RoomLandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [roomName, setRoomName] = useState('')
  const [joinValue, setJoinValue] = useState('')
  const [error, setError] = useState(null)

  const onCreate = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const room = await createRoom(roomName)
      navigate(`/room/${room.id}`)
    } catch (err) {
      setError(getApiError(err).message)
    }
  }

  const onJoin = async (e) => {
    e.preventDefault()
    setError(null)
    const roomId = extractRoomId(joinValue)
    if (!roomId) return
    try {
      await joinRoom(roomId)
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(getApiError(err).message)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">Musical Room</h1>
      <p className="mb-8 text-neutral-400">Listen to the same song together, in sync, on every device.</p>

      {location.state?.notice && (
        <p className="mb-6 rounded bg-amber-500/10 px-4 py-2 text-amber-300">{location.state.notice}</p>
      )}
      {error && <p className="mb-6 rounded bg-red-500/10 px-4 py-2 text-red-300">{error}</p>}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={onCreate} className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Create a room</h2>
          <input
            data-testid="room-create-name"
            required
            maxLength={100}
            placeholder="Room name"
            className={inputClass}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button
            data-testid="room-create-submit"
            className="rounded-md bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400"
          >
            Create Room
          </button>
        </form>

        <form onSubmit={onJoin} className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Join a room</h2>
          <input
            data-testid="room-join-input"
            required
            placeholder="Room ID or join link"
            className={inputClass}
            value={joinValue}
            onChange={(e) => setJoinValue(e.target.value)}
          />
          <button
            data-testid="room-join-submit"
            className="rounded-md bg-neutral-100 py-2 font-semibold text-black hover:bg-white"
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  )
}
