import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LeaveRoomButton from './LeaveRoomButton'

describe('LeaveRoomButton', () => {
  it('is a red button with bold white text and an exit icon', () => {
    render(<LeaveRoomButton onLeave={() => {}} />)
    const button = screen.getByRole('button', { name: 'Leave Room' })
    expect(button).toHaveClass('bg-red-600', 'font-bold', 'text-white')
    expect(button.querySelector('svg')).toBeInTheDocument()
  })

  it('calls onLeave when clicked', async () => {
    const onLeave = vi.fn()
    render(<LeaveRoomButton onLeave={onLeave} />)
    await userEvent.click(screen.getByRole('button', { name: 'Leave Room' }))
    expect(onLeave).toHaveBeenCalledTimes(1)
  })
})
