import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { createRoom, joinRoom } from '../../api/rooms'
import { extractRoomId } from '../../utils/rooms'

const inputClass =
  'w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500'

export default function RoomLandingPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [roomName, setRoomName] = useState('')
  const [joinValue, setJoinValue] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(null)

  const onCreate = async (e) => {
    e.preventDefault()
    setError(null)
    if (!roomName.trim()) {
      setError('Give your room a name.')
      return
    }
    setBusy('create')
    try {
      const room = await createRoom(roomName.trim())
      navigate(`/room/${room.id}`)
    } catch (err) {
      setError(getApiError(err).message)
      setBusy(null)
    }
  }

  const onJoin = async (e) => {
    e.preventDefault()
    setError(null)
    const roomId = extractRoomId(joinValue)
    if (!roomId) {
      setError('Enter an 8-character Room ID or paste a join link.')
      return
    }
    setBusy('join')
    try {
      await joinRoom(roomId)
      navigate(`/room/${roomId}`)
    } catch (err) {
      setError(getApiError(err).message)
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-3xl font-bold">Musical Room</h1>
      <p className="mb-8 text-neutral-400">Listen to the same song together, in sync, on every device.</p>

      {location.state?.notice && (
        <p data-testid="room-landing-notice" className="mb-6 rounded bg-amber-500/10 px-4 py-2 text-amber-300">
          {location.state.notice}
        </p>
      )}
      {error && (
        <p role="alert" className="mb-6 rounded bg-red-500/10 px-4 py-2 text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={onCreate} className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Create a room</h2>
          <input
            data-testid="room-create-name"
            aria-label="Room name"
            required
            maxLength={100}
            placeholder="Room name"
            className={inputClass}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button
            data-testid="room-create-submit"
            disabled={busy !== null}
            className="rounded-md bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
          >
            {busy === 'create' ? 'Creating…' : 'Create Room'}
          </button>
        </form>

        <form onSubmit={onJoin} className="flex flex-col gap-3 rounded-xl bg-neutral-900 p-6">
          <h2 className="text-lg font-semibold">Join a room</h2>
          <input
            data-testid="room-join-input"
            aria-label="Room ID or join link"
            required
            placeholder="Room ID or join link"
            className={inputClass}
            value={joinValue}
            onChange={(e) => setJoinValue(e.target.value)}
          />
          <button
            data-testid="room-join-submit"
            disabled={busy !== null}
            className="rounded-md bg-neutral-100 py-2 font-semibold text-black hover:bg-white disabled:opacity-60"
          >
            {busy === 'join' ? 'Joining…' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  )
}
