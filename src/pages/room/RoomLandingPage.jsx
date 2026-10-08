import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { getApiError } from '../../api/client'
import { createRoom, joinRoom } from '../../api/rooms'
import { extractRoomId } from '../../utils/rooms'

const ROOM_NAME_MAX = 100
const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition duration-200 hover:border-neutral-700 focus:border-emerald-500/70 focus:bg-neutral-950 focus:ring-4 focus:ring-emerald-500/15'
const cardClass =
  'group relative flex flex-col overflow-hidden rounded-2xl border border-neutral-800 bg-linear-to-b from-neutral-900 to-neutral-950 p-5 shadow-xl shadow-black/30 transition duration-300 hover:-translate-y-0.5 hover:border-neutral-700 hover:shadow-2xl sm:p-6'
const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:ring-4 focus-visible:outline-none active:translate-y-0 disabled:pointer-events-none disabled:opacity-60'

const Icon = ({ children, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const PlusIcon = (p) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
)
const EnterIcon = (p) => (
  <Icon {...p}>
    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" />
  </Icon>
)
const AlertIcon = (p) => (
  <Icon {...p}>
    <path d="M12 8v5m0 3.5v.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
  </Icon>
)
const InfoIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5m0-8v.01" />
  </Icon>
)
const Spinner = () => (
  <svg viewBox="0 0 24 24" className="h-4 w-4 motion-safe:animate-spin" fill="none" aria-hidden="true">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
    <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
  </svg>
)

const FEATURES = [
  { title: 'In perfect sync', text: 'Every device plays the same moment, within a few milliseconds.' },
  { title: 'Share control', text: 'Hand the controls to a friend and take them back anytime.' },
  { title: 'Any device', text: 'Phones, tablets and laptops join with a link or Room ID.' },
]

/** Decorative equalizer for the hero. */
function Equalizer() {
  return (
    <div aria-hidden="true" className="flex h-10 items-end gap-1">
      {[0.55, 0.9, 0.4, 1, 0.65, 0.8, 0.45].map((h, i) => (
        <span
          key={i}
          className="w-1.5 origin-bottom rounded-full bg-linear-to-t from-emerald-600 to-emerald-300 motion-safe:animate-eq"
          style={{ height: `${h * 100}%`, animationDelay: `${i * -0.17}s` }}
        />
      ))}
    </div>
  )
}

function Banner({ tone, icon, children, ...props }) {
  const tones = {
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
    red: 'border-red-500/30 bg-red-500/10 text-red-300',
  }
  return (
    <div {...props} className={`mb-6 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm motion-safe:animate-rise ${tones[tone]}`}>
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{children}</span>
    </div>
  )
}

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

  const detectedId = joinValue.trim() ? extractRoomId(joinValue) : null

  return (
    <div className="mx-auto max-w-4xl">
      <section className="relative mb-8 overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900/60 px-6 py-8 shadow-2xl shadow-black/40 motion-safe:animate-rise sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
        <div className="relative flex items-end justify-between gap-6">
          <div>
            <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Listen together
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">Musical Room</h1>
            <p className="mt-2 max-w-md text-neutral-400">Listen to the same song together, in sync, on every device.</p>
          </div>
          <div className="hidden sm:block">
            <Equalizer />
          </div>
        </div>
        <ul className="relative mt-6 grid gap-2 sm:mt-8 sm:grid-cols-3 sm:gap-3">
          {FEATURES.map((f) => (
            <li key={f.title} className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 px-4 py-2.5 sm:py-3">
              <p className="text-sm font-semibold text-neutral-100">{f.title}</p>
              <p className="mt-0.5 hidden text-xs leading-relaxed text-neutral-400 sm:block">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {location.state?.notice && (
        <Banner tone="amber" icon={<InfoIcon className="h-4 w-4" />} data-testid="room-landing-notice">
          {location.state.notice}
        </Banner>
      )}
      {error && (
        <Banner tone="red" icon={<AlertIcon className="h-4 w-4" />} role="alert">
          {error}
        </Banner>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <form onSubmit={onCreate} className={`${cardClass} motion-safe:animate-enter`}>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-emerald-400/60 to-transparent" />
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/25 transition duration-300 group-hover:scale-105">
              <PlusIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Create a room</h2>
              <p className="text-sm text-neutral-400">You control playback and can hand it over.</p>
            </div>
          </div>
          <label htmlFor="room-create-name" className="mb-1.5 flex text-xs font-medium tracking-wide text-neutral-300 uppercase">
            Room name
            <span className="ml-auto font-normal tracking-normal text-neutral-500 normal-case tabular-nums">
              {roomName.length}/{ROOM_NAME_MAX}
            </span>
          </label>
          <input
            id="room-create-name"
            data-testid="room-create-name"
            aria-label="Room name"
            required
            maxLength={ROOM_NAME_MAX}
            placeholder="e.g. Friday night mix"
            className={inputClass}
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
          />
          <button
            data-testid="room-create-submit"
            disabled={busy !== null}
            className={`${buttonBase} mt-5 bg-linear-to-r from-emerald-400 to-emerald-500 text-neutral-950 shadow-lg shadow-emerald-500/20 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/35 focus-visible:ring-emerald-500/30`}
          >
            {busy === 'create' ? <Spinner /> : <PlusIcon className="h-4 w-4" />}
            {busy === 'create' ? 'Creating…' : 'Create Room'}
          </button>
        </form>

        <form onSubmit={onJoin} className={`${cardClass} motion-safe:animate-enter [animation-delay:80ms]`}>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-neutral-400/40 to-transparent" />
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-950 shadow-lg shadow-black/40 transition duration-300 group-hover:scale-105">
              <EnterIcon />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white">Join a room</h2>
              <p className="text-sm text-neutral-400">Use the Room ID or the link a friend shared.</p>
            </div>
          </div>
          <label htmlFor="room-join-input" className="mb-1.5 flex text-xs font-medium tracking-wide text-neutral-300 uppercase">
            Room ID or link
            {detectedId && (
              <span className="ml-auto inline-flex items-center gap-1 font-mono font-normal tracking-wider text-emerald-400 normal-case motion-safe:animate-rise">
                <Icon className="h-3.5 w-3.5">
                  <path d="m5 12 5 5L20 7" />
                </Icon>
                {detectedId}
              </span>
            )}
          </label>
          <input
            id="room-join-input"
            data-testid="room-join-input"
            aria-label="Room ID or join link"
            required
            placeholder="AB12CD34 or https://…/room/AB12CD34"
            className={inputClass}
            value={joinValue}
            onChange={(e) => setJoinValue(e.target.value)}
          />
          <button
            data-testid="room-join-submit"
            disabled={busy !== null}
            className={`${buttonBase} mt-5 bg-neutral-100 text-neutral-950 shadow-lg shadow-black/40 hover:bg-white focus-visible:ring-white/30`}
          >
            {busy === 'join' ? <Spinner /> : <EnterIcon className="h-4 w-4" />}
            {busy === 'join' ? 'Joining…' : 'Join Room'}
          </button>
        </form>
      </div>
    </div>
  )
}
