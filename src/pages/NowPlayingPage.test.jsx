import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as libraryApi from '../api/library'
import { LibraryProvider } from '../context/LibraryContext'
import { PlayerProvider, usePlayer } from '../context/PlayerContext'
import { FakeAudio, likeOf, playOf, SONGS } from '../testUtils'
import NowPlayingPage from './NowPlayingPage'

vi.mock('../api/library')
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))

const { eveningBreeze, greyRain, heartstrings } = SONGS
const QUEUE = [eveningBreeze, heartstrings, greyRain]

let audio
let player

function Probe() {
  const current = usePlayer()
  useEffect(() => {
    player = current
  })
  return null
}

function renderPage() {
  return render(
    <MemoryRouter>
      <LibraryProvider>
        <PlayerProvider createAudio={() => audio}>
          <Probe />
          <NowPlayingPage />
        </PlayerProvider>
      </LibraryProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  audio = new FakeAudio()
  libraryApi.getLikedSongs.mockResolvedValue([])
  libraryApi.getRecentlyPlayed.mockResolvedValue([])
  libraryApi.logPlay.mockImplementation(async (id) =>
    playOf(Object.values(SONGS).find((s) => s.id === id)),
  )
})

describe('NowPlayingPage', () => {
  it('shows an empty state when nothing is playing', () => {
    renderPage()
    expect(screen.getByText('Nothing is playing yet.')).toBeInTheDocument()
  })

  it('shows the current song metadata, state and queue', async () => {
    renderPage()
    await waitFor(() => expect(libraryApi.getLikedSongs).toHaveBeenCalled())
    await act(async () => player.playSong(heartstrings, QUEUE))

    const details = screen.getByRole('heading', { name: 'Heartstrings' }).parentElement
    expect(within(details).getByText('The Lovelines')).toBeInTheDocument()
    expect(within(details).getByText('Forever Yours')).toBeInTheDocument()
    expect(within(details).getByText(/love · 3:20/)).toBeInTheDocument()
    expect(screen.getByTestId('now-playing-state')).toHaveTextContent('Now playing')

    const upNext = screen.getByRole('region', { name: 'Up Next' })
    const rows = within(upNext).getAllByRole('listitem')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toHaveAttribute('aria-current', 'true')
    expect(rows[0]).not.toHaveAttribute('aria-current')

    act(() => player.togglePlay())
    expect(screen.getByTestId('now-playing-state')).toHaveTextContent('Paused')
  })

  it('shows the music director only when the song has one', async () => {
    renderPage()
    await waitFor(() => expect(libraryApi.getLikedSongs).toHaveBeenCalled())
    const scored = { ...heartstrings, music_director: 'Ilaiyaraaja' }
    await act(async () => player.playSong(scored, [scored, greyRain]))
    expect(screen.getByText('Music by Ilaiyaraaja')).toBeInTheDocument()

    await act(async () => player.playSong(greyRain, [scored, greyRain]))
    expect(screen.queryByText(/Music by/)).not.toBeInTheDocument()
  })

  it('likes the current song without interrupting playback', async () => {
    libraryApi.likeSong.mockResolvedValue(likeOf(eveningBreeze))
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(libraryApi.getLikedSongs).toHaveBeenCalled())
    await act(async () => player.playSong(eveningBreeze, QUEUE))

    const main = screen.getByRole('heading', { name: 'Evening Breeze' }).parentElement
    await user.click(within(main).getByRole('button', { name: 'Like Evening Breeze' }))

    expect(await within(main).findByText('♥ Liked')).toBeInTheDocument()
    expect(audio.pause).not.toHaveBeenCalled()
    expect(screen.getByTestId('now-playing-state')).toHaveTextContent('Now playing')
  })

  it('plays another song from the queue', async () => {
    const user = userEvent.setup()
    renderPage()
    await waitFor(() => expect(libraryApi.getLikedSongs).toHaveBeenCalled())
    await act(async () => player.playSong(eveningBreeze, QUEUE))

    const upNext = screen.getByRole('region', { name: 'Up Next' })
    await user.click(within(upNext).getByText('Grey Rain'))
    expect(screen.getByRole('heading', { name: 'Grey Rain' })).toBeInTheDocument()
    expect(libraryApi.logPlay).toHaveBeenLastCalledWith(greyRain.id)
  })
})
