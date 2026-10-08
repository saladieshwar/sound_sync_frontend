import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as songsApi from '../api/songs'
import Navbar from '../components/layout/Navbar'
import { apiError, renderWithRouter, SONGS } from '../testUtils'
import SearchPage from './SearchPage'

vi.mock('../api/songs')
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { username: 'alice', is_admin: false }, logout: vi.fn() }),
}))
vi.mock('../context/LibraryContext', () => ({
  useLibrary: () => ({ likedIds: new Set(), toggleLike: vi.fn() }),
}))
vi.mock('../context/PlayerContext', () => ({ usePlayer: () => ({ playSong: vi.fn() }) }))

const { greyRain, riseUp } = SONGS

const renderSearch = (path) =>
  renderWithRouter(
    <>
      <Route path="/" element={<Navbar />} />
      <Route
        path="/search"
        element={
          <>
            <Navbar />
            <SearchPage />
          </>
        }
      />
    </>,
    path,
  )

beforeEach(() => {
  songsApi.searchSongs.mockImplementation(async (q) =>
    [greyRain, riseUp].filter((s) => s.title.toLowerCase().includes(q.toLowerCase())),
  )
})

describe('SearchPage', () => {
  it('navbar search navigates to results that match', async () => {
    const user = userEvent.setup()
    renderSearch('/')

    await user.type(screen.getByRole('searchbox', { name: 'Search songs' }), '  rain {Enter}')

    expect(screen.getByTestId('current-path')).toHaveTextContent('/search')
    expect(await screen.findByText('Grey Rain')).toBeInTheDocument()
    expect(screen.queryByText('Rise Up')).not.toBeInTheDocument()
    expect(screen.getByText('1 song')).toBeInTheDocument()
    expect(songsApi.searchSongs).toHaveBeenCalledWith('rain')
  })

  it('does not search for a blank navbar query', async () => {
    const user = userEvent.setup()
    renderSearch('/')
    await user.type(screen.getByRole('searchbox'), '   {Enter}')
    expect(screen.getByTestId('current-path')).toHaveTextContent('/')
    expect(songsApi.searchSongs).not.toHaveBeenCalled()
  })

  it('shows a no-match message', async () => {
    renderSearch('/search?q=zzz')
    expect(await screen.findByText('No songs match “zzz”.')).toBeInTheDocument()
    expect(screen.getByText('0 songs')).toBeInTheDocument()
  })

  it('keeps the navbar input in sync with the URL query', async () => {
    renderSearch('/search?q=rise')
    expect(screen.getByRole('searchbox')).toHaveValue('rise')
    expect(await screen.findByText('Rise Up')).toBeInTheDocument()
  })

  it('shows a loading state while searching', async () => {
    songsApi.searchSongs.mockReturnValue(new Promise(() => {}))
    renderSearch('/search?q=rain')
    expect(screen.getByText('Loading songs…')).toBeInTheDocument()
  })

  it('shows the API error and retries', async () => {
    songsApi.searchSongs.mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    const user = userEvent.setup()
    renderSearch('/search?q=rain')

    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error')
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Grey Rain')).toBeInTheDocument()
  })

  it('prompts instead of calling the API when the query is empty', () => {
    renderSearch('/search?q=%20%20')
    expect(screen.getByText(/Type in the search bar/)).toBeInTheDocument()
    expect(songsApi.searchSongs).not.toHaveBeenCalled()
  })
})
