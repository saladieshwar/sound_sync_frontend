import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as roomsApi from '../../api/rooms'
import { apiError } from '../../testUtils'
import RoomLandingPage from './RoomLandingPage'

vi.mock('../../api/rooms')

function Path() {
  return <div data-testid="current-path">{useLocation().pathname}</div>
}

const renderLanding = (entry = '/room') =>
  render(
    <MemoryRouter initialEntries={[entry]}>
      <Routes>
        <Route path="/room" element={<RoomLandingPage />} />
        <Route path="/room/:roomId" element={<h1>In room</h1>} />
      </Routes>
      <Path />
    </MemoryRouter>,
  )

beforeEach(() => {
  roomsApi.createRoom.mockResolvedValue({ id: 'AB12CD34' })
  roomsApi.joinRoom.mockResolvedValue({ id: 'AB12CD34' })
})

describe('RoomLandingPage', () => {
  it('creates a room with a trimmed name and opens it', async () => {
    renderLanding()
    await userEvent.type(screen.getByTestId('room-create-name'), '  Friday night  ')
    await userEvent.click(screen.getByTestId('room-create-submit'))

    expect(roomsApi.createRoom).toHaveBeenCalledWith('Friday night')
    expect(await screen.findByText('In room')).toBeInTheDocument()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/room/AB12CD34')
  })

  it('rejects a blank room name without calling the API', async () => {
    renderLanding()
    await userEvent.type(screen.getByTestId('room-create-name'), '   ')
    await userEvent.click(screen.getByTestId('room-create-submit'))
    expect(screen.getByRole('alert')).toHaveTextContent('Give your room a name.')
    expect(roomsApi.createRoom).not.toHaveBeenCalled()
  })

  it('joins by a typed Room ID in any letter case', async () => {
    renderLanding()
    await userEvent.type(screen.getByTestId('room-join-input'), 'ab12cd34')
    await userEvent.click(screen.getByTestId('room-join-submit'))

    expect(roomsApi.joinRoom).toHaveBeenCalledWith('AB12CD34')
    expect(await screen.findByText('In room')).toBeInTheDocument()
  })

  it('joins by a pasted join link', async () => {
    renderLanding()
    await userEvent.type(
      screen.getByTestId('room-join-input'),
      'http://192.168.1.20:5173/room/AB12CD34?ref=chat',
    )
    await userEvent.click(screen.getByTestId('room-join-submit'))
    expect(roomsApi.joinRoom).toHaveBeenCalledWith('AB12CD34')
    expect(screen.getByTestId('current-path')).toHaveTextContent('/room/AB12CD34')
  })

  it('explains an invalid Room ID without calling the API', async () => {
    renderLanding()
    await userEvent.type(screen.getByTestId('room-join-input'), 'nope')
    await userEvent.click(screen.getByTestId('room-join-submit'))
    expect(screen.getByRole('alert')).toHaveTextContent('Enter an 8-character Room ID')
    expect(roomsApi.joinRoom).not.toHaveBeenCalled()
  })

  it('shows the server error when the room cannot be joined', async () => {
    roomsApi.joinRoom.mockRejectedValue(apiError(410, 'ROOM_CLOSED', 'Room is closed'))
    renderLanding()
    await userEvent.type(screen.getByTestId('room-join-input'), 'AB12CD34')
    await userEvent.click(screen.getByTestId('room-join-submit'))

    expect(await screen.findByRole('alert')).toHaveTextContent('Room is closed')
    expect(screen.getByTestId('current-path')).toHaveTextContent(/^\/room$/)
  })

  it('shows a notice passed from a room that was closed', () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/room', state: { notice: 'The room was closed by its admin.' } }]}>
        <RoomLandingPage />
      </MemoryRouter>,
    )
    expect(screen.getByTestId('room-landing-notice')).toHaveTextContent('The room was closed by its admin.')
  })
})
