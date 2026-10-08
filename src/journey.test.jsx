/**
 * Phase 6 FE: the full user journey in one uninterrupted session, through the real App, routes and
 * providers (same tree as main.jsx). Only the network edge is faked: API modules, WebSocket, audio.
 *
 * register -> home -> play -> like -> search -> Musical Room -> create -> sync -> leave -> home
 */
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import * as authApi from './api/auth'
import { TOKEN_KEY } from './api/client'
import * as libraryApi from './api/library'
import * as roomsApi from './api/rooms'
import * as songsApi from './api/songs'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import { PlayerProvider } from './context/PlayerContext'
import { ALBUMS, FakeAudio, likeOf, MockWebSocket, playOf, SONGS } from './testUtils'

vi.mock('./api/auth')
vi.mock('./api/library')
vi.mock('./api/rooms')
vi.mock('./api/songs')

const { eveningBreeze, heartstrings, riseUp, greyRain } = SONGS
const CATALOG = [eveningBreeze, heartstrings, riseUp, greyRain]
const RIYA = { id: 11, username: 'riya', email: 'riya@soundsync.dev', is_admin: false }
const BEN = { id: 12, username: 'ben', email: 'ben@soundsync.dev', is_admin: false }
const ROOM_ID = 'JRNY2026'

const room = (overrides = {}) => ({
  id: ROOM_ID,
  name: 'Friday mix',
  admin_user_id: RIYA.id,
  controller_user_id: RIYA.id,
  current_song_id: null,
  is_playing: false,
  position_seconds: 0,
  state_updated_at: new Date().toISOString(),
  status: 'active',
  created_at: new Date().toISOString(),
  participants: [{ user: RIYA, joined_at: new Date().toISOString() }],
  join_link: `http://localhost:5173/room/${ROOM_ID}`,
  ...overrides,
})

const paths = []
function PathRecorder() {
  const location = useLocation()
  if (paths.at(-1) !== location.pathname) paths.push(location.pathname)
  return <div data-testid="path">{location.pathname + location.search}</div>
}

let audio

beforeEach(() => {
  localStorage.clear()
  paths.length = 0
  audio = new FakeAudio()
  MockWebSocket.reset()
  vi.stubGlobal('WebSocket', MockWebSocket)

  authApi.register.mockResolvedValue(RIYA)
  authApi.login.mockResolvedValue({ access_token: 'riya.jwt', token_type: 'bearer', user: RIYA })

  songsApi.listCategories.mockResolvedValue(['love', 'melody', 'motivation', 'sad'])
  songsApi.listAlbums.mockResolvedValue(ALBUMS)
  songsApi.listSongs.mockResolvedValue(CATALOG)
  songsApi.searchSongs.mockImplementation(async (q) =>
    CATALOG.filter((s) => `${s.title} ${s.artist} ${s.album}`.toLowerCase().includes(q.toLowerCase())),
  )
  songsApi.getSong.mockImplementation(async (id) => CATALOG.find((s) => s.id === id))

  libraryApi.getLikedSongs.mockResolvedValue([])
  libraryApi.getRecentlyPlayed.mockResolvedValue([])
  libraryApi.logPlay.mockImplementation(async (id) => playOf(CATALOG.find((s) => s.id === id)))
  libraryApi.likeSong.mockImplementation(async (id) => likeOf(CATALOG.find((s) => s.id === id)))

  roomsApi.createRoom.mockResolvedValue(room())
  roomsApi.getRoom.mockResolvedValue(room())
  roomsApi.leaveRoom.mockResolvedValue({ message: 'Room closed' })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it('completes register -> home -> player -> room -> leave in one uninterrupted session', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider>
        <LibraryProvider>
          <PlayerProvider createAudio={() => audio}>
            <App />
            <PathRecorder />
          </PlayerProvider>
        </LibraryProvider>
      </AuthProvider>
    </MemoryRouter>,
  )

  // --- auth: anonymous visitor is sent to login, registers, lands on Home -------------------
  await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/login'))
  await user.click(screen.getByRole('link', { name: 'Register' }))
  await user.type(screen.getByTestId('register-username'), 'riya')
  await user.type(screen.getByTestId('register-email'), 'riya@soundsync.dev')
  await user.type(screen.getByTestId('register-password'), 'riya-secret-1')
  await user.click(screen.getByTestId('register-submit'))

  await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/$/))
  expect(authApi.register).toHaveBeenCalledWith({
    username: 'riya',
    email: 'riya@soundsync.dev',
    password: 'riya-secret-1',
  })
  expect(localStorage.getItem(TOKEN_KEY)).toBe('riya.jwt')

  // --- home: catalog and library load --------------------------------------------------------
  const allSongs = await screen.findByRole('region', { name: 'All Songs' })
  await within(allSongs).findByText('Evening Breeze')
  expect(await screen.findByTestId('section-item-love')).toBeInTheDocument()
  expect(screen.getByTestId('section-item-Calm Skies')).toBeInTheDocument()

  // --- player: play a song, it is logged to Recently Played ---------------------------------
  await user.click(within(allSongs).getByText('Evening Breeze'))
  await waitFor(() => expect(audio.play).toHaveBeenCalled())
  expect(audio.src).toContain(eveningBreeze.audio_url)
  expect(screen.getByTestId('player-title')).toHaveTextContent('Evening Breeze')
  await waitFor(() => expect(libraryApi.logPlay).toHaveBeenCalledWith(eveningBreeze.id))
  const recent = screen.getByRole('region', { name: 'Recently Played' })
  await within(recent).findByText('Evening Breeze')

  // Like it from the footer player; it shows up under Liked Songs.
  await user.click(screen.getByTestId('player-like'))
  await waitFor(() => expect(libraryApi.likeSong).toHaveBeenCalledWith(eveningBreeze.id))
  await within(screen.getByRole('region', { name: 'Liked Songs' })).findByText('Evening Breeze')

  // --- search from the navbar and play a result ----------------------------------------------
  await user.type(screen.getByTestId('navbar-search'), 'rain{Enter}')
  await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent('/search?q=rain'))
  await user.click(await screen.findByText('Grey Rain'))
  await waitFor(() => expect(screen.getByTestId('player-title')).toHaveTextContent('Grey Rain'))
  expect(libraryApi.logPlay).toHaveBeenCalledWith(greyRain.id)

  // --- Musical Room: create, connect, controller picks a song, everyone hears it ------------
  await user.click(screen.getByRole('link', { name: 'Musical Room' }))
  await user.type(await screen.findByTestId('room-create-name'), 'Friday mix')
  await user.click(screen.getByTestId('room-create-submit'))
  expect(roomsApi.createRoom).toHaveBeenCalledWith('Friday mix')
  await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(`/room/${ROOM_ID}`))

  await waitFor(() => expect(MockWebSocket.instances).toHaveLength(1))
  const ws = MockWebSocket.latest()
  expect(ws.url).toBe(`ws://localhost:8000/rooms/${ROOM_ID}/ws?token=riya.jwt`)
  act(() => {
    ws.open()
    ws.receive('room_state', { ...room(), online_user_ids: [RIYA.id] })
  })
  expect(screen.getByTestId('socket-status')).toHaveTextContent('Live')
  expect(screen.getByTestId('room-controller')).toHaveTextContent('You control playback for everyone.')
  // Entering a room with nothing playing stops the solo song and locks the footer controls.
  await waitFor(() => expect(audio.paused).toBe(true))
  expect(screen.getByTestId('player-toggle')).toBeDisabled()

  // A friend joins.
  roomsApi.getRoom.mockResolvedValue(
    room({ participants: [RIYA, BEN].map((u) => ({ user: u, joined_at: new Date().toISOString() })) }),
  )
  act(() => ws.receive('user_joined', { user_id: BEN.id }))
  expect(await screen.findByTestId(`participant-${BEN.id}`)).toBeInTheDocument()

  // Controller picks a song: it goes to the server, and plays when the broadcast comes back.
  const picker = await screen.findByTestId('room-song-picker')
  await user.click(within(picker).getByText('Heartstrings'))
  expect(ws.sent.filter((m) => m.type !== 'time_sync')).toEqual([
    { type: 'song_change', payload: { song_id: heartstrings.id, position_seconds: 0 } },
  ])
  act(() =>
    ws.receive(
      'song_change',
      { song_id: heartstrings.id, position_seconds: 0, is_playing: true },
      { senderUserId: RIYA.id },
    ),
  )
  await waitFor(() => expect(screen.getByTestId('room-song-title')).toHaveTextContent('Heartstrings'))
  await waitFor(() => expect(audio.paused).toBe(false))
  expect(audio.src).toContain(heartstrings.audio_url)
  expect(screen.getByTestId('room-toggle')).toHaveAccessibleName('Pause for everyone')

  // Pause for everyone.
  await user.click(screen.getByTestId('room-toggle'))
  expect(ws.sent.filter((m) => m.type !== 'time_sync').at(-1).type).toBe('pause')
  act(() =>
    ws.receive(
      'pause',
      { song_id: heartstrings.id, position_seconds: 3, is_playing: false },
      { senderUserId: RIYA.id },
    ),
  )
  await waitFor(() => expect(audio.paused).toBe(true))
  expect(audio.currentTime).toBeCloseTo(3, 1)

  // --- leave: back to the room landing page, socket closed, player unlocked ------------------
  await user.click(screen.getByTestId('leave-room'))
  expect(roomsApi.leaveRoom).toHaveBeenCalledWith(ROOM_ID)
  await waitFor(() => expect(screen.getByTestId('path')).toHaveTextContent(/^\/room$/))
  expect(ws.close).toHaveBeenCalled()
  act(() => ws.receive('room_closed', {})) // late broadcast after leaving is ignored
  expect(screen.getByTestId('path')).toHaveTextContent(/^\/room$/)

  // --- home again: solo playback works, still the same session --------------------------------
  await user.click(screen.getByRole('link', { name: 'Home' }))
  const allSongsAgain = await screen.findByRole('region', { name: 'All Songs' })
  await user.click(within(allSongsAgain).getByText('Rise Up'))
  await waitFor(() => expect(screen.getByTestId('player-title')).toHaveTextContent('Rise Up'))
  expect(audio.paused).toBe(false)
  expect(screen.getByTestId('player-toggle')).toBeEnabled()
  expect(libraryApi.logPlay).toHaveBeenLastCalledWith(riseUp.id)

  // One uninterrupted session: logged in once, never bounced back to /login.
  expect(authApi.login).toHaveBeenCalledTimes(1)
  expect(authApi.getMe).not.toHaveBeenCalled()
  expect(paths.filter((p) => p === '/login')).toHaveLength(1)
  expect(localStorage.getItem(TOKEN_KEY)).toBe('riya.jwt')
  expect(paths).toEqual([
    '/', // protected: redirected to /login
    '/login',
    '/register',
    '/',
    '/search',
    '/room',
    `/room/${ROOM_ID}`,
    '/room',
    '/',
  ])
}, 30_000)
