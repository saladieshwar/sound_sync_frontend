import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as libraryApi from '../../api/library'
import * as roomsApi from '../../api/rooms'
import * as songsApi from '../../api/songs'
import { LibraryProvider } from '../../context/LibraryContext'
import { PlayerProvider } from '../../context/PlayerContext'
import { apiError, FakeAudio, MockWebSocket, renderWithRouter, SONGS } from '../../testUtils'
import RoomLandingPage from './RoomLandingPage'
import RoomPage from './RoomPage'

vi.mock('../../api/rooms')
vi.mock('../../api/songs')
vi.mock('../../api/library')
const auth = vi.hoisted(() => ({ current: null }))
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth.current }))

const ADMIN = { id: 1, username: 'admin' }
const BOB = { id: 2, username: 'bob' }
const ROOM_ID = 'AB12CD34'
const { eveningBreeze, heartstrings } = SONGS

const roomFixture = (overrides = {}) => ({
  id: ROOM_ID,
  name: 'Friday night',
  admin_user_id: ADMIN.id,
  controller_user_id: ADMIN.id,
  current_song_id: null,
  is_playing: false,
  position_seconds: 0,
  state_updated_at: '2026-10-03T10:00:00Z',
  status: 'active',
  created_at: '2026-10-03T10:00:00Z',
  participants: [ADMIN, BOB].map((user) => ({ user, joined_at: '2026-10-03T10:00:00Z' })),
  join_link: `http://localhost:5173/room/${ROOM_ID}`,
  ...overrides,
})

/** A room that started playing Evening Breeze just now. */
const playingRoom = () =>
  roomFixture({
    current_song_id: eveningBreeze.id,
    is_playing: true,
    state_updated_at: new Date().toISOString(),
  })

let audio

function renderRoom({ user = ADMIN, path = `/room/${ROOM_ID}` } = {}) {
  auth.current = { user, token: `token-${user.id}`, isAuthenticated: true }
  const wrapper = ({ children }) => (
    <LibraryProvider>
      <PlayerProvider createAudio={() => audio}>{children}</PlayerProvider>
    </LibraryProvider>
  )
  return renderWithRouter(
    [
      <Route key="landing" path="/room" element={<RoomLandingPage />} />,
      <Route key="room" path="/room/:roomId" element={<RoomPage />} />,
    ],
    path,
    wrapper,
  )
}

/** Renders the room and completes the WS handshake with an initial room_state. */
async function enterRoom({ user = ADMIN, state = roomFixture(), online = [ADMIN.id, BOB.id] } = {}) {
  roomsApi.getRoom.mockResolvedValue(state)
  renderRoom({ user })
  await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
  const ws = MockWebSocket.latest()
  act(() => {
    ws.open()
    ws.receive('room_state', { ...state, online_user_ids: online })
  })
  return ws
}

const playback = (song, position, playing) => ({
  song_id: song.id,
  position_seconds: position,
  is_playing: playing,
})

beforeEach(() => {
  audio = new FakeAudio()
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)
  libraryApi.getLikedSongs.mockResolvedValue([])
  libraryApi.getRecentlyPlayed.mockResolvedValue([])
  songsApi.listSongs.mockResolvedValue([eveningBreeze, heartstrings])
  songsApi.getSong.mockImplementation(async (id) =>
    Object.values(SONGS).find((s) => s.id === id),
  )
  roomsApi.leaveRoom.mockResolvedValue({ message: 'Left room' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

const roomSent = (ws) => ws.sent.filter((m) => m.type !== 'time_sync')

describe('RoomPage — joining', () => {
  it('opening a join link shows a Join Room prompt and does not auto-join', async () => {
    roomsApi.getRoom.mockRejectedValue(apiError(403, 'NOT_ROOM_PARTICIPANT', 'Not a participant'))
    roomsApi.joinRoom.mockResolvedValue(roomFixture())
    renderRoom({ user: BOB, path: `/room/${ROOM_ID.toLowerCase()}` })

    expect(await screen.findByText(`You've been invited to room ${ROOM_ID}`)).toBeInTheDocument()
    expect(roomsApi.joinRoom).not.toHaveBeenCalled()
    expect(MockWebSocket.instances).toHaveLength(0)

    await userEvent.click(screen.getByTestId('room-join-confirm'))
    expect(roomsApi.joinRoom).toHaveBeenCalledWith(ROOM_ID)
    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
    expect(MockWebSocket.latest().url).toBe(`ws://localhost:8000/rooms/${ROOM_ID}/ws?token=token-2`)
  })

  it.each([
    [404, 'ROOM_NOT_FOUND', 'Room not found'],
    [410, 'ROOM_CLOSED', 'Room is closed'],
  ])('shows %i errors with a way back', async (status, code, message) => {
    roomsApi.getRoom.mockRejectedValue(apiError(status, code, message))
    renderRoom()
    expect(await screen.findByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('link', { name: 'Back to Musical Room' })).toHaveAttribute('href', '/room')
  })
})

describe('RoomPage — in-room view', () => {
  it('shows the room, the join link, live status and who is online', async () => {
    await enterRoom({ online: [ADMIN.id] })
    expect(screen.getByRole('heading', { name: 'Friday night' })).toBeInTheDocument()
    expect(screen.getByTestId('room-id')).toHaveTextContent(ROOM_ID)
    expect(screen.getByTestId('room-join-link')).toHaveValue(`http://localhost:5173/room/${ROOM_ID}`)
    expect(screen.getByTestId('socket-status')).toHaveTextContent('Live')
    expect(within(screen.getByTestId('participant-1')).getByRole('img', { name: 'Online' })).toBeInTheDocument()
    expect(within(screen.getByTestId('participant-2')).getByRole('img', { name: 'Offline' })).toBeInTheDocument()
    expect(screen.getByTestId('leave-room')).toHaveClass('bg-red-600', 'font-bold', 'text-white')
  })

  it('joins a playing room at the current position', async () => {
    const serverTs = Date.now()
    await enterRoom({
      user: BOB,
      state: roomFixture({
        current_song_id: eveningBreeze.id,
        is_playing: true,
        position_seconds: 30,
        state_updated_at: new Date(serverTs - 10_000).toISOString(),
      }),
    })
    await waitFor(() => expect(audio.play).toHaveBeenCalled())
    expect(audio.src).toBe('http://localhost:8000/media/audio/sample-1.mp3')
    expect(Math.abs(audio.currentTime - 40)).toBeLessThan(0.5)
    expect(screen.getByTestId('room-song-title')).toHaveTextContent('Evening Breeze')
  })

  it('copies the join link, and falls back to manual copy without clipboard access', async () => {
    await enterRoom()
    const writeText = vi.fn().mockResolvedValue()
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    await userEvent.click(screen.getByTestId('room-copy-link'))
    expect(writeText).toHaveBeenCalledWith(`http://localhost:5173/room/${ROOM_ID}`)
    expect(await screen.findByText('Copied!')).toBeInTheDocument()

    vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
    await userEvent.click(screen.getByTestId('room-copy-link'))
    expect(await screen.findByText('Copy the link above manually.')).toBeInTheDocument()
  })
})

describe('RoomPage — controller', () => {
  it('sends song_change, play/pause and one seek per drag', async () => {
    const ws = await enterRoom()
    await userEvent.click(within(screen.getByTestId('room-song-picker')).getByText('Heartstrings'))
    expect(roomSent(ws).at(-1)).toEqual({
      type: 'song_change',
      payload: { song_id: heartstrings.id, position_seconds: 0 },
    })
    // Local playback only changes when the broadcast comes back.
    expect(audio.play).not.toHaveBeenCalled()

    act(() => ws.receive('song_change', playback(heartstrings, 0, true), { senderUserId: ADMIN.id }))
    await waitFor(() => expect(audio.play).toHaveBeenCalled())

    await userEvent.click(screen.getByRole('button', { name: 'Pause for everyone' }))
    expect(roomSent(ws).at(-1).type).toBe('pause')

    const seek = screen.getByTestId('room-seek')
    fireEvent.change(seek, { target: { value: '50' } })
    fireEvent.change(seek, { target: { value: '80' } })
    fireEvent.change(seek, { target: { value: '120.5' } })
    fireEvent.pointerUp(seek)
    const seeks = ws.sent.filter((m) => m.type === 'seek')
    expect(seeks).toEqual([{ type: 'seek', payload: { position_seconds: 120.5 } }])
  })

  it('asks for play when the room is paused even if local audio is playing', async () => {
    const ws = await enterRoom({
      state: roomFixture({ current_song_id: eveningBreeze.id, is_playing: false, position_seconds: 12 }),
    })
    await userEvent.click(await screen.findByRole('button', { name: 'Play for everyone' }))
    expect(roomSent(ws).at(-1)).toEqual({ type: 'play', payload: { position_seconds: 12 } })
  })

  it('gives control to a participant', async () => {
    roomsApi.transferAccess.mockResolvedValue(roomFixture({ controller_user_id: BOB.id }))
    await enterRoom()
    await userEvent.click(screen.getByRole('button', { name: 'Give control to bob' }))
    expect(roomsApi.transferAccess).toHaveBeenCalledWith(ROOM_ID, BOB.id)
    expect(await screen.findByTestId('room-controller')).toHaveTextContent('bob controls playback')
    expect(screen.queryByTestId('room-song-picker')).not.toBeInTheDocument()
  })

  it('shows friendly text for socket errors', async () => {
    const ws = await enterRoom()
    act(() => ws.receive('error', { code: 'NO_CURRENT_SONG' }))
    expect(screen.getByTestId('room-notice')).toHaveTextContent('Pick a song for the room first.')
  })
})

describe('RoomPage — listener', () => {
  it('cannot drive playback and follows play, seek and pause broadcasts', async () => {
    const ws = await enterRoom({ user: BOB })
    expect(screen.getByTestId('room-toggle')).toBeDisabled()
    expect(screen.getByTestId('room-seek')).toBeDisabled()
    expect(screen.queryByTestId('room-song-picker')).not.toBeInTheDocument()
    expect(screen.getByTestId('room-controller')).toHaveTextContent('admin controls playback')

    act(() => ws.receive('song_change', playback(eveningBreeze, 0, true), { senderUserId: ADMIN.id }))
    await waitFor(() => expect(audio.play).toHaveBeenCalled())
    expect(screen.getByTestId('room-song-title')).toHaveTextContent('Evening Breeze')

    act(() => ws.receive('seek', playback(eveningBreeze, 95, true)))
    await waitFor(() => expect(Math.abs(audio.currentTime - 95)).toBeLessThan(0.5))

    act(() => ws.receive('pause', playback(eveningBreeze, 97, false)))
    await waitFor(() => expect(audio.paused).toBe(true))
    expect(audio.currentTime).toBe(97)
  })

  it('stops when the server clears the room song because an admin deleted it', async () => {
    const ws = await enterRoom({ user: BOB, state: playingRoom() })
    await waitFor(() => expect(audio.play).toHaveBeenCalled())

    act(() => ws.receive('pause', { song_id: null, position_seconds: 0, is_playing: false }))
    await waitFor(() => expect(screen.getByTestId('room-song-title')).toHaveTextContent('Nothing yet'))
    expect(audio.paused).toBe(true)
    expect(screen.queryByTestId('room-sync-audio')).not.toBeInTheDocument()
    expect(screen.queryByTestId('room-notice')).not.toBeInTheDocument()
  })

  it('takes over the controls when control is transferred to them', async () => {
    const ws = await enterRoom({ user: BOB })
    act(() => ws.receive('access_transfer', { controller_user_id: BOB.id }))
    expect(screen.getByTestId('room-song-picker')).toBeInTheDocument()
    expect(screen.getByTestId('room-controller')).toHaveTextContent('You control playback')

    act(() => ws.receive('access_transfer', { controller_user_id: ADMIN.id }))
    expect(screen.queryByTestId('room-song-picker')).not.toBeInTheDocument()
  })

  it('offers a tap-to-listen button when the browser blocks autoplay', async () => {
    const blocked = Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }))
    blocked.catch(() => {})
    audio.playResult = blocked
    const ws = await enterRoom({ user: BOB })
    act(() => ws.receive('song_change', playback(eveningBreeze, 0, true)))

    const unlock = await screen.findByTestId('room-sync-audio')
    audio.playResult = null
    await userEvent.click(unlock)
    await waitFor(() => expect(screen.queryByTestId('room-sync-audio')).not.toBeInTheDocument())
    expect(audio.paused).toBe(false)
  })
})

describe('RoomPage — presence, leaving and closing', () => {
  it('updates participants as people join and leave', async () => {
    const CAROL = { id: 3, username: 'carol' }
    const ws = await enterRoom({ online: [ADMIN.id] })
    roomsApi.getRoom.mockResolvedValue(
      roomFixture({
        participants: [ADMIN, BOB, CAROL].map((user) => ({ user, joined_at: '2026-10-03T10:00:00Z' })),
      }),
    )
    act(() => ws.receive('user_joined', { user_id: CAROL.id }))
    expect(await screen.findByTestId('participant-3')).toHaveTextContent('carol')
    expect(within(screen.getByTestId('participant-3')).getByRole('img', { name: 'Online' })).toBeInTheDocument()

    act(() => ws.receive('user_left', { user_id: CAROL.id, reason: 'disconnected' }))
    expect(within(screen.getByTestId('participant-3')).getByRole('img', { name: 'Offline' })).toBeInTheDocument()

    act(() => ws.receive('user_left', { user_id: CAROL.id, reason: 'left', controller_user_id: ADMIN.id }))
    expect(screen.queryByTestId('participant-3')).not.toBeInTheDocument()
  })

  it('leaving calls the API, stops room audio and returns to the landing page', async () => {
    const ws = await enterRoom({ user: BOB, state: playingRoom() })
    await waitFor(() => expect(audio.play).toHaveBeenCalled())

    await userEvent.click(screen.getByTestId('leave-room'))
    expect(roomsApi.leaveRoom).toHaveBeenCalledWith(ROOM_ID)
    expect(await screen.findByRole('heading', { name: 'Musical Room' })).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/room$/)
    expect(audio.paused).toBe(true)
    expect(audio.src).toBe('')
    expect(ws.close).toHaveBeenCalled()
  })

  it('returns everyone to the landing page when the admin closes the room', async () => {
    const ws = await enterRoom({ user: BOB, state: playingRoom() })
    await waitFor(() => expect(audio.play).toHaveBeenCalled())

    act(() => ws.receive('room_closed'))
    expect(await screen.findByTestId('room-landing-notice')).toHaveTextContent(
      'The room was closed by its admin.',
    )
    expect(audio.paused).toBe(true)
  })

  it('leaves the page when removed from the room elsewhere', async () => {
    const ws = await enterRoom({ user: BOB })
    act(() => ws.serverClose(1000))
    expect(await screen.findByTestId('room-landing-notice')).toHaveTextContent(
      'You are no longer in this room.',
    )
  })

  it('reconnects after a network drop and resyncs from room_state', async () => {
    const ws = await enterRoom({ user: BOB })
    act(() => ws.serverClose(1006))
    expect(screen.getByTestId('socket-status')).toHaveTextContent('Reconnecting…')

    await waitFor(() => expect(MockWebSocket.instances).toHaveLength(2), { timeout: 4000 })
    const again = MockWebSocket.latest()
    act(() => {
      again.open()
      again.receive('room_state', {
        ...roomFixture({ current_song_id: heartstrings.id, is_playing: false, position_seconds: 64 }),
        online_user_ids: [ADMIN.id, BOB.id],
      })
    })
    expect(screen.getByTestId('socket-status')).toHaveTextContent('Live')
    await waitFor(() => expect(screen.getByTestId('room-song-title')).toHaveTextContent('Heartstrings'))
    expect(audio.currentTime).toBe(64)
    expect(audio.paused).toBe(true)
  })
})
