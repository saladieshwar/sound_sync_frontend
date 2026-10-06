import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import ParticipantList from './ParticipantList'

const ADMIN = { id: 1, username: 'admin' }
const BOB = { id: 2, username: 'bob' }
const CAROL = { id: 3, username: 'carol' }

const room = (overrides = {}) => ({
  admin_user_id: ADMIN.id,
  controller_user_id: ADMIN.id,
  participants: [ADMIN, BOB, CAROL].map((user) => ({ user, joined_at: '2026-10-03T10:00:00Z' })),
  ...overrides,
})

const renderList = ({ currentUserId = ADMIN.id, onlineIds = [ADMIN.id], ...overrides } = {}) => {
  const onTransfer = vi.fn()
  render(
    <ParticipantList
      room={room(overrides)}
      currentUserId={currentUserId}
      onlineIds={new Set(onlineIds)}
      onTransfer={onTransfer}
    />,
  )
  return onTransfer
}

describe('ParticipantList', () => {
  it('lists every participant with admin, controller and you badges', () => {
    renderList({ controller_user_id: BOB.id })
    const admin = screen.getByTestId('participant-1')
    expect(admin).toHaveTextContent('admin (you)')
    expect(admin).toHaveTextContent('Admin')
    expect(screen.getByTestId('participant-2')).toHaveTextContent('Controller')
    expect(screen.getAllByRole('listitem')).toHaveLength(3)
  })

  it('shows who is online', () => {
    renderList({ onlineIds: [ADMIN.id, CAROL.id] })
    expect(within(screen.getByTestId('participant-1')).getByRole('img', { name: 'Online' })).toBeInTheDocument()
    expect(within(screen.getByTestId('participant-2')).getByRole('img', { name: 'Offline' })).toBeInTheDocument()
    expect(within(screen.getByTestId('participant-3')).getByRole('img', { name: 'Online' })).toBeInTheDocument()
  })

  it('lets the admin give control to another participant', async () => {
    const onTransfer = renderList()
    expect(screen.queryByTestId('transfer-1')).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Give control to bob' }))
    expect(onTransfer).toHaveBeenCalledWith(BOB.id)
  })

  it('lets the current controller hand control back', async () => {
    const onTransfer = renderList({ currentUserId: BOB.id, controller_user_id: BOB.id })
    await userEvent.click(screen.getByRole('button', { name: 'Give control to admin' }))
    expect(onTransfer).toHaveBeenCalledWith(ADMIN.id)
  })

  it('hides transfer buttons from regular participants', () => {
    renderList({ currentUserId: CAROL.id })
    expect(screen.queryByRole('button', { name: /Give control/ })).not.toBeInTheDocument()
  })
})
