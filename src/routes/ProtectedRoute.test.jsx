import { screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../api/client'
import { apiError, renderAuthRoutes } from '../testUtils'

vi.mock('../api/auth', () => ({ login: vi.fn(), register: vi.fn(), getMe: vi.fn() }))
vi.mock('../api/health', () => ({ getHealth: vi.fn(() => Promise.resolve({ status: 'ok' })) }))

const user = { id: 2, username: 'alice', email: 'alice@soundsync.dev', is_admin: false }
const admin = { id: 1, username: 'admin', email: 'admin@soundsync.dev', is_admin: true }

describe('ProtectedRoute', () => {
  it.each(['/', '/room', '/admin'])('redirects anonymous visitors from %s to /login', (path) => {
    renderAuthRoutes(path)
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
    expect(screen.getByTestId('login-submit')).toBeInTheDocument()
  })

  it('shows a loading state while a stored token is being validated', () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockReturnValue(new Promise(() => {}))
    renderAuthRoutes('/room')
    expect(screen.getByText('Loading…')).toBeInTheDocument()
  })

  it('renders the protected page for a valid stored token', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockResolvedValue(user)
    renderAuthRoutes('/room')
    expect(await screen.findByText('Room page')).toBeInTheDocument()
  })

  it('redirects to /login when the stored token is expired or invalid', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired.jwt')
    authApi.getMe.mockRejectedValue(apiError(401, 'INVALID_TOKEN', 'Invalid or expired token'))
    renderAuthRoutes('/room')

    await waitFor(() => expect(screen.getByTestId('current-path')).toHaveTextContent('/login'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })
})

describe('AdminRoute', () => {
  it('sends non-admin users back to Home', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockResolvedValue(user)
    renderAuthRoutes('/admin')
    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })

  it('lets admins in', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockResolvedValue(admin)
    renderAuthRoutes('/admin')
    expect(await screen.findByText('Admin page')).toBeInTheDocument()
  })
})
