import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as libraryApi from '../api/library'
import * as songsApi from '../api/songs'
import { LibraryProvider } from '../context/LibraryContext'
import { ALBUMS, apiError, likeOf, playOf, renderWithRouter, SONGS } from '../testUtils'
import HomePage from './HomePage'

vi.mock('../api/songs')
vi.mock('../api/library')
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))
const playSong = vi.fn()
vi.mock('../context/PlayerContext', () => ({ usePlayer: () => ({ playSong }) }))

const { eveningBreeze, greyRain, heartstrings, riseUp } = SONGS
const ALL = [eveningBreeze, heartstrings, riseUp, greyRain]

const renderHome = () =>
  renderWithRouter(
    <>
      <Route path="/" element={<HomePage />} />
      <Route path="/category/:name" element={<h1>Category page</h1>} />
      <Route path="/album/:name" element={<h1>Album page</h1>} />
    </>,
    '/',
    LibraryProvider,
  )

const section = (name) => screen.getByRole('region', { name })

beforeEach(() => {
  songsApi.listCategories.mockResolvedValue(['love', 'melody', 'motivation', 'sad'])
  songsApi.listAlbums.mockResolvedValue(ALBUMS)
  songsApi.listSongs.mockResolvedValue(ALL)
  libraryApi.getLikedSongs.mockResolvedValue([likeOf(riseUp)])
  libraryApi.getRecentlyPlayed.mockResolvedValue([
    playOf(greyRain, '2026-10-03T12:00:00Z'),
    playOf(eveningBreeze, '2026-10-03T11:00:00Z'),
    playOf(greyRain, '2026-10-03T10:00:00Z'),
  ])
})

describe('HomePage', () => {
  it('shows loading states, then real data in every section', async () => {
    renderHome()
    expect(screen.getByText('Loading categories…')).toBeInTheDocument()
    expect(screen.getByText('Loading albums…')).toBeInTheDocument()

    const categories = await screen.findByRole('region', { name: 'Categories' })
    for (const c of ['love', 'melody', 'motivation', 'sad']) {
      expect(within(categories).getByText(c)).toBeInTheDocument()
    }

    const albums = section('Albums')
    expect(within(albums).getByText('Calm Skies')).toBeInTheDocument()
    expect(within(albums).getByText('Aria Nova')).toBeInTheDocument()
    expect(within(albums).getByRole('img', { name: 'Calm Skies' })).toHaveAttribute(
      'src',
      expect.stringContaining('/media/covers/calm-skies.svg'),
    )
    expect(within(albums).getByRole('img', { name: 'Quiet Rooms' }).tagName).toBe('SPAN')

    const all = section('All Songs')
    await waitFor(() => expect(within(all).getAllByRole('listitem')).toHaveLength(4))
  })

  it('shows recently played most recent first without duplicates', async () => {
    renderHome()
    const recent = section('Recently Played')
    await waitFor(() => expect(within(recent).getAllByRole('listitem')).toHaveLength(2))
    const titles = within(recent).getAllByRole('listitem').map((li) => li.textContent)
    expect(titles[0]).toContain('Grey Rain')
    expect(titles[1]).toContain('Evening Breeze')
  })

  it('reflects likes live: liking in All Songs adds to Liked Songs, unliking removes', async () => {
    libraryApi.likeSong.mockResolvedValue(likeOf(heartstrings, '2026-10-03T13:00:00Z'))
    libraryApi.unlikeSong.mockResolvedValue({ status: 204 })
    const user = userEvent.setup()
    renderHome()

    const liked = section('Liked Songs')
    await within(liked).findByText('Rise Up')
    expect(within(liked).queryByText('Heartstrings')).not.toBeInTheDocument()

    const all = section('All Songs')
    await user.click(await within(all).findByRole('button', { name: 'Like Heartstrings' }))

    await within(liked).findByText('Heartstrings')
    expect(libraryApi.likeSong).toHaveBeenCalledWith(heartstrings.id)
    expect(within(all).getByRole('button', { name: 'Unlike Heartstrings' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(within(liked).getByRole('button', { name: 'Unlike Rise Up' }))
    await waitFor(() => expect(within(liked).queryByText('Rise Up')).not.toBeInTheDocument())
    expect(within(all).getByRole('button', { name: 'Like Rise Up' })).toBeInTheDocument()
  })

  it('shows helpful empty library messages for a new user', async () => {
    libraryApi.getLikedSongs.mockResolvedValue([])
    libraryApi.getRecentlyPlayed.mockResolvedValue([])
    renderHome()
    expect(await screen.findByText('Tap ♥ on any song to like it.')).toBeInTheDocument()
    expect(screen.getByText('Songs you play will show up here.')).toBeInTheDocument()
  })

  it('navigates to a category and an album when their cards are clicked', async () => {
    const user = userEvent.setup()
    const view = renderHome()
    await user.click(await screen.findByTestId('section-item-sad'))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/category/sad')

    view.unmount()
    renderHome()
    await user.click(await screen.findByTestId('section-item-Calm Skies'))
    expect(screen.getByTestId('current-path')).toHaveTextContent('/album/Calm%20Skies')
  })

  it('plays a song with its list as the queue', async () => {
    const user = userEvent.setup()
    renderHome()
    const all = section('All Songs')
    await user.click(await within(all).findByText('Rise Up'))
    expect(playSong).toHaveBeenCalledWith(riseUp, ALL)
  })

  it('shows an error with retry when the catalog fails to load', async () => {
    songsApi.listSongs.mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    const user = userEvent.setup()
    renderHome()

    const all = section('All Songs')
    expect(await within(all).findByRole('alert')).toHaveTextContent('Internal server error')

    await user.click(within(all).getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(within(all).getAllByRole('listitem')).toHaveLength(4))
    expect(songsApi.listSongs).toHaveBeenCalledTimes(2)
  })
})
