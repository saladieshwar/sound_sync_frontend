import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as libraryApi from '../../api/library'
import { LibraryProvider } from '../../context/LibraryContext'
import { PlayerProvider, usePlayer } from '../../context/PlayerContext'
import { FakeAudio, likeOf, playOf, SONGS } from '../../testUtils'
import FooterPlayer from './FooterPlayer'

vi.mock('../../api/library')
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ isAuthenticated: true }) }))

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

function renderFooter() {
  return render(
    <MemoryRouter>
      <LibraryProvider>
        <PlayerProvider createAudio={() => audio}>
          <Probe />
          <FooterPlayer />
        </PlayerProvider>
      </LibraryProvider>
    </MemoryRouter>,
  )
}

async function renderPlaying(song = eveningBreeze) {
  const view = renderFooter()
  await waitFor(() => expect(libraryApi.getLikedSongs).toHaveBeenCalled())
  await act(async () => player.playSong(song, QUEUE))
  return view
}

beforeEach(() => {
  localStorage.clear()
  audio = new FakeAudio()
  libraryApi.getLikedSongs.mockResolvedValue([])
  libraryApi.getRecentlyPlayed.mockResolvedValue([])
  libraryApi.logPlay.mockImplementation(async (id) =>
    playOf(Object.values(SONGS).find((s) => s.id === id)),
  )
})

describe('FooterPlayer', () => {
  it('shows an empty, disabled player before anything is played', () => {
    renderFooter()
    expect(screen.getByTestId('player-title')).toHaveTextContent('Nothing playing')
    for (const name of ['Previous', 'Play', 'Next']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled()
  })

  it('shows song metadata and wires play events to the API', async () => {
    await renderPlaying()
    expect(screen.getByTestId('player-title')).toHaveTextContent('Evening Breeze')
    expect(screen.getByText('Aria Nova')).toBeInTheDocument()
    expect(screen.getByTestId('player-duration')).toHaveTextContent('3:20')
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled()
    expect(libraryApi.logPlay).toHaveBeenCalledTimes(1)
    expect(libraryApi.logPlay).toHaveBeenCalledWith(eveningBreeze.id)
  })

  it('play/pause, next and previous buttons drive the player', async () => {
    const user = userEvent.setup()
    await renderPlaying()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(audio.pause).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    expect(screen.getByTestId('player-title')).toHaveTextContent('Heartstrings')
    await user.click(screen.getByRole('button', { name: 'Previous' }))
    expect(screen.getByTestId('player-title')).toHaveTextContent('Evening Breeze')
    expect(libraryApi.logPlay).toHaveBeenCalledTimes(3)
  })

  it('disables Next on the last song in the queue', async () => {
    await renderPlaying(greyRain)
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  })

  it('seeks accurately on release, and ignores live progress while dragging', async () => {
    await renderPlaying()
    act(() => audio.loadMetadata(200))
    const seekBar = screen.getByRole('slider', { name: 'Seek' })

    fireEvent.change(seekBar, { target: { value: '100.5' } })
    act(() => audio.advanceTo(5))
    expect(screen.getByTestId('player-position')).toHaveTextContent('1:40')
    expect(seekBar).toHaveValue('100.5')
    expect(audio.currentTime).toBe(5)

    fireEvent.pointerUp(seekBar)
    expect(audio.currentTime).toBe(100.5)
    expect(Math.abs(audio.currentTime - 100.5)).toBeLessThanOrEqual(0.5)

    act(() => audio.advanceTo(101))
    expect(screen.getByTestId('player-position')).toHaveTextContent('1:41')
  })

  it('commits keyboard seeks on key release', async () => {
    await renderPlaying()
    const seekBar = screen.getByRole('slider', { name: 'Seek' })
    fireEvent.change(seekBar, { target: { value: '60' } })
    fireEvent.keyUp(seekBar, { key: 'ArrowRight' })
    expect(audio.currentTime).toBe(60)
  })

  it('volume and mute apply immediately and persist after reload', async () => {
    const user = userEvent.setup()
    const view = await renderPlaying()

    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '0.4' } })
    expect(audio.volume).toBe(0.4)
    await user.click(screen.getByRole('button', { name: 'Mute' }))
    expect(audio.muted).toBe(true)
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0')
    expect(audio.pause).not.toHaveBeenCalled()

    view.unmount()
    audio = new FakeAudio()
    renderFooter()
    expect(screen.getByRole('button', { name: 'Unmute' })).toHaveAttribute('aria-pressed', 'true')
    expect(audio.muted).toBe(true)
    expect(audio.volume).toBe(0.4)

    await user.click(screen.getByRole('button', { name: 'Unmute' }))
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0.4')
  })

  it('likes and unlikes mid-playback without interrupting the song', async () => {
    libraryApi.likeSong.mockResolvedValue(likeOf(eveningBreeze))
    libraryApi.unlikeSong.mockResolvedValue({ status: 204 })
    const user = userEvent.setup()
    await renderPlaying()
    act(() => audio.advanceTo(42))

    await user.click(screen.getByRole('button', { name: 'Like Evening Breeze' }))
    expect(libraryApi.likeSong).toHaveBeenCalledWith(eveningBreeze.id)
    expect(await screen.findByRole('button', { name: 'Unlike Evening Breeze' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )

    await user.click(screen.getByRole('button', { name: 'Unlike Evening Breeze' }))
    expect(await screen.findByRole('button', { name: 'Like Evening Breeze' })).toBeInTheDocument()

    expect(audio.pause).not.toHaveBeenCalled()
    expect(audio.currentTime).toBe(42)
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
  })

  it('shows loading and error states', async () => {
    audio.playResult = new Promise(() => {})
    await renderPlaying()
    expect(screen.getByTestId('player-status')).toHaveTextContent('Loading…')

    act(() => audio.emit('error'))
    expect(screen.getByTestId('player-status')).toHaveTextContent("Can't play this song")
  })

  it('locks local controls while a Musical Room controls playback', async () => {
    await renderPlaying(heartstrings)
    act(() => player.setRoomLocked(true))
    expect(screen.getByText('Room controlled')).toBeInTheDocument()
    for (const name of ['Previous', 'Pause', 'Next']) {
      expect(screen.getByRole('button', { name })).toBeDisabled()
    }
    expect(screen.getByRole('slider', { name: 'Seek' })).toBeDisabled()
  })
})
