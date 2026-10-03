import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { vi } from 'vitest'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminRoute from './routes/AdminRoute'
import ProtectedRoute from './routes/ProtectedRoute'

/** Builds the error shape axios rejects with for a BE structured error response. */
export const apiError = (status, code, message, details = {}) =>
  Object.assign(new Error(message), {
    response: { status, data: { error: { code, message, details } } },
  })

function CurrentPath() {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

/** Catalog fixtures mirroring a slice of the BE seed (backend/scripts/seed.py). */
const song = (id, title, artist, album, category) => ({
  id,
  title,
  artist,
  album,
  category,
  duration_seconds: 200,
  audio_url: `/media/audio/sample-${id}.mp3`,
  cover_url: null,
  created_at: '2026-10-03T00:00:00Z',
})

export const SONGS = {
  eveningBreeze: song(1, 'Evening Breeze', 'Aria Nova', 'Calm Skies', 'melody'),
  heartstrings: song(3, 'Heartstrings', 'The Lovelines', 'Forever Yours', 'love'),
  riseUp: song(5, 'Rise Up', 'Peak Drive', 'Unstoppable', 'motivation'),
  greyRain: song(7, 'Grey Rain', 'Blue Hours', 'Quiet Rooms', 'sad'),
}

export const ALBUMS = [
  { name: 'Calm Skies', artist: 'Aria Nova', cover_url: '/media/covers/calm-skies.svg', song_count: 2 },
  { name: 'Quiet Rooms', artist: 'Blue Hours', cover_url: null, song_count: 2 },
]

export const likeOf = (s, likedAt = '2026-10-03T10:00:00Z') => ({ song: s, liked_at: likedAt })
export const playOf = (s, playedAt = '2026-10-03T10:00:00Z') => ({ song: s, played_at: playedAt })

/**
 * Stand-in for HTMLAudioElement (jsdom does not implement playback). `play()` succeeds and fires
 * `playing` unless `playResult` is set to a promise (e.g. never-resolving, or rejected).
 */
export class FakeAudio extends EventTarget {
  constructor() {
    super()
    this.src = ''
    this.paused = true
    this.currentTime = 0
    this.duration = Number.NaN
    this.volume = 1
    this.muted = false
    this.playResult = null
    this.play = vi.fn(() => {
      this.paused = false
      if (this.playResult) return this.playResult
      this.emit('playing')
      return Promise.resolve()
    })
    this.pause = vi.fn(() => {
      if (this.paused) return
      this.paused = true
      this.emit('pause')
    })
    this.load = vi.fn()
  }

  emit(type) {
    this.dispatchEvent(new Event(type))
  }

  /** Simulates the browser reading the file's metadata. */
  loadMetadata(duration) {
    this.duration = duration
    this.emit('loadedmetadata')
  }

  /** Simulates playback progressing to `seconds`. */
  advanceTo(seconds) {
    this.currentTime = seconds
    this.emit('timeupdate')
  }

  getAttribute(name) {
    return name === 'src' && this.src ? this.src : null
  }

  removeAttribute(name) {
    if (name === 'src') this.src = ''
  }
}

/** Renders `routes` (Route elements) inside a router with a current-path probe. */
export function renderWithRouter(routes, initialPath = '/', wrapper = ({ children }) => children) {
  const Wrapper = wrapper
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Wrapper>
        <Routes>{routes}</Routes>
        <CurrentPath />
      </Wrapper>
    </MemoryRouter>,
  )
}

/** Renders the auth-relevant route tree from App.jsx with lightweight page stand-ins. */
export function renderAuthRoutes(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<h1>Home page</h1>} />
            <Route path="room" element={<h1>Room page</h1>} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<h1>Admin page</h1>} />
            </Route>
          </Route>
        </Routes>
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>,
  )
}
