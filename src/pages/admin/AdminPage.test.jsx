import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as adminApi from '../../api/admin'
import * as songsApi from '../../api/songs'
import { apiError, SONGS } from '../../testUtils'
import AdminPage from './AdminPage'

vi.mock('../../api/admin')
vi.mock('../../api/songs')

const { eveningBreeze, greyRain } = SONGS
const openTab = (name) => userEvent.click(screen.getByRole('tab', { name }))
// jsdom's constraint validation does not see files added by userEvent.upload, so submit directly.
const submit = () => fireEvent.submit(screen.getByRole('button', { name: 'Upload' }).closest('form'))

beforeEach(() => {
  songsApi.listSongs.mockResolvedValue([eveningBreeze, greyRain])
  adminApi.listUsers.mockResolvedValue([
    { id: 1, username: 'admin', email: 'admin@soundsync.dev', is_admin: true, created_at: '2026-10-03T00:00:00Z' },
    { id: 2, username: 'riya', email: 'riya@soundsync.dev', is_admin: false, created_at: '2026-10-04T00:00:00Z' },
  ])
  adminApi.listRooms.mockResolvedValue([
    {
      id: 'AB12CD34',
      name: 'Friday night',
      is_playing: true,
      created_at: '2026-10-07T10:00:00Z',
      participants: [{ user: { id: 2, username: 'riya' } }],
    },
  ])
})

afterEach(() => vi.unstubAllGlobals())

describe('AdminPage — upload (ADM-01)', () => {
  const fillForm = async () => {
    await userEvent.type(screen.getByLabelText('Title'), 'New Song')
    await userEvent.type(screen.getByLabelText('Artist'), 'New Artist')
    await userEvent.type(screen.getByLabelText('Category'), 'melody')
    await userEvent.type(screen.getByLabelText('Duration in seconds'), '180')
    const audio = new File(['RIFF'], 'new.wav', { type: 'audio/wav' })
    await userEvent.upload(screen.getByLabelText(/Audio file/), audio)
  }

  it('uploads the form as multipart data and confirms', async () => {
    adminApi.uploadSong.mockResolvedValue({ ...eveningBreeze, id: 99, title: 'New Song' })
    render(<AdminPage />)
    await fillForm()
    submit()

    expect(await screen.findByRole('status')).toHaveTextContent('Uploaded “New Song”')
    const sent = adminApi.uploadSong.mock.calls[0][0]
    expect(sent.get('title')).toBe('New Song')
    expect(sent.get('category')).toBe('melody')
    expect(sent.has('audio_file')).toBe(true) // file contents: browser E2E (scripts/browser_e2e.py)
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('shows the API reason when an upload is rejected', async () => {
    adminApi.uploadSong.mockRejectedValue(
      apiError(415, 'UNSUPPORTED_FILE_TYPE', 'audio_file must be one of: .mp3, .wav'),
    )
    render(<AdminPage />)
    await fillForm()
    submit()
    expect(await screen.findByRole('alert')).toHaveTextContent('audio_file must be one of')
    expect(screen.getByLabelText('Title')).toHaveValue('New Song') // kept so it can be fixed
  })

  it('shows the chosen audio file and the duration as minutes, and clears them after upload', async () => {
    adminApi.uploadSong.mockResolvedValue({ ...eveningBreeze, id: 99, title: 'New Song' })
    render(<AdminPage />)
    await fillForm()
    expect(screen.getByText('new.wav')).toBeInTheDocument()
    expect(screen.getByText('3:00')).toBeInTheDocument()

    submit()
    await screen.findByRole('status')
    expect(screen.queryByText('new.wav')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Duration in seconds')).toHaveValue(null)
  })

  it('only offers supported file types in the picker', () => {
    render(<AdminPage />)
    expect(screen.getByLabelText(/Audio file/)).toHaveAttribute('accept', expect.stringContaining('.mp3'))
    expect(screen.getByLabelText(/Cover image/).getAttribute('accept')).not.toContain('svg')
  })
})

describe('AdminPage — songs (ADM-05)', () => {
  it('deletes a song after confirmation and refreshes the list', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    adminApi.deleteSong.mockResolvedValue({})
    render(<AdminPage />)
    await openTab('Songs')
    await screen.findByTestId(`admin-song-${greyRain.id}`)

    songsApi.listSongs.mockResolvedValue([eveningBreeze])
    await userEvent.click(screen.getByRole('button', { name: 'Delete Grey Rain' }))

    expect(window.confirm).toHaveBeenCalled()
    expect(adminApi.deleteSong).toHaveBeenCalledWith(greyRain.id)
    expect(await screen.findByRole('status')).toHaveTextContent('Deleted “Grey Rain”')
    await waitFor(() => expect(screen.queryByTestId(`admin-song-${greyRain.id}`)).not.toBeInTheDocument())
  })

  it('does nothing when the confirmation is cancelled', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    render(<AdminPage />)
    await openTab('Songs')
    await userEvent.click(await screen.findByRole('button', { name: 'Delete Grey Rain' }))
    expect(adminApi.deleteSong).not.toHaveBeenCalled()
  })
})

describe('AdminPage — users and rooms (ADM-04)', () => {
  it('lists users with their role', async () => {
    render(<AdminPage />)
    await openTab('Users')
    const riya = await screen.findByTestId('admin-user-2')
    expect(within(riya).getByText('riya@soundsync.dev')).toBeInTheDocument()
    expect(within(riya).getByText('User')).toBeInTheDocument()
    expect(within(screen.getByTestId('admin-user-1')).getByText('Admin')).toBeInTheDocument()
  })

  it('lists active rooms', async () => {
    render(<AdminPage />)
    await openTab('Rooms')
    const room = await screen.findByTestId('admin-room-AB12CD34')
    expect(within(room).getByText('Friday night')).toBeInTheDocument()
    expect(within(room).getByText('Playing')).toBeInTheDocument()
    expect(within(room).getByText('1')).toBeInTheDocument()
  })

  it('shows each category as its own tag and labels the song count', async () => {
    songsApi.listSongs.mockResolvedValue([{ ...eveningBreeze, category: 'love, melody' }, greyRain])
    render(<AdminPage />)
    await openTab('Songs')
    const row = await screen.findByTestId(`admin-song-${eveningBreeze.id}`)
    expect(within(row).getByText('love')).toBeInTheDocument()
    expect(within(row).getByText('melody')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Songs' }).closest('header')).toHaveTextContent('2')
  })

  it('shows an error with retry instead of an empty table when loading fails', async () => {
    adminApi.listRooms.mockRejectedValueOnce(new Error('Network Error'))
    render(<AdminPage />)
    await openTab('Rooms')
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to reach server')
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByTestId('admin-room-AB12CD34')).toBeInTheDocument()
  })

  it('says so when there are no active rooms', async () => {
    adminApi.listRooms.mockResolvedValue([])
    render(<AdminPage />)
    await openTab('Rooms')
    expect(await screen.findByText('No active rooms right now.')).toBeInTheDocument()
  })
})
