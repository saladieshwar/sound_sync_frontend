import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as songsApi from '../api/songs'
import { apiError, renderWithRouter, SONGS } from '../testUtils'
import BrowsePage from './BrowsePage'

vi.mock('../api/songs')
vi.mock('../context/LibraryContext', () => ({
  useLibrary: () => ({ likedIds: new Set(), toggleLike: vi.fn() }),
}))
const playSong = vi.fn()
vi.mock('../context/PlayerContext', () => ({ usePlayer: () => ({ playSong }) }))

const { eveningBreeze, greyRain } = SONGS

const renderBrowse = (path) =>
  renderWithRouter(
    <>
      <Route path="/category/:name" element={<BrowsePage mode="category" />} />
      <Route path="/album/:name" element={<BrowsePage mode="album" />} />
    </>,
    path,
  )

beforeEach(() => {
  songsApi.songsByCategory.mockImplementation(async (name) =>
    Object.values(SONGS).filter((s) => s.category === name.toLowerCase()),
  )
  songsApi.songsByAlbum.mockImplementation(async (name) =>
    Object.values(SONGS).filter((s) => s.album === name),
  )
})

describe('BrowsePage', () => {
  it('lists only the songs in the selected category', async () => {
    renderBrowse('/category/sad')
    expect(screen.getByRole('heading', { name: 'sad' })).toBeInTheDocument()
    const list = await screen.findByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(1)
    expect(within(list).getByText(greyRain.title)).toBeInTheDocument()
    expect(songsApi.songsByCategory).toHaveBeenCalledWith('sad')
    expect(songsApi.songsByAlbum).not.toHaveBeenCalled()
  })

  it('lists the songs of an album (URL-decoded name)', async () => {
    renderBrowse('/album/Calm%20Skies')
    expect(await screen.findByText(eveningBreeze.title)).toBeInTheDocument()
    expect(songsApi.songsByAlbum).toHaveBeenCalledWith('Calm Skies')
  })

  it('shows the song count and length, and plays the whole album from the first song', async () => {
    const user = userEvent.setup()
    renderBrowse('/album/Calm%20Skies')
    const albumSongs = Object.values(SONGS).filter((s) => s.album === 'Calm Skies')
    expect(await screen.findByText('1 song')).toBeInTheDocument()
    expect(screen.getByText('3 min')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Play all' }))
    expect(playSong).toHaveBeenCalledWith(albumSongs[0], albumSongs)
  })

  it('shows an empty message for an unknown category', async () => {
    renderBrowse('/category/jazz')
    expect(await screen.findByText('No songs in this category yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Play all' })).not.toBeInTheDocument()
  })

  it('shows a loading state and then an error', async () => {
    songsApi.songsByCategory.mockRejectedValueOnce(apiError(500, 'INTERNAL_ERROR', 'Internal server error'))
    renderBrowse('/category/sad')
    expect(screen.getByText('Loading songs…')).toBeInTheDocument()
    expect(await screen.findByRole('alert')).toHaveTextContent('Internal server error')
  })
})
