import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../api/client'
import { apiError } from '../testUtils'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../api/auth', () => ({ login: vi.fn(), register: vi.fn(), getMe: vi.fn() }))

const alice = { id: 2, username: 'alice', email: 'alice@soundsync.dev', is_admin: false }

function Probe() {
  const { user, loading, isAuthenticated, login, register, logout } = useAuth()
  return (
    <div>
      <p data-testid="state">{loading ? 'loading' : isAuthenticated ? `user:${user.username}` : 'anonymous'}</p>
      <button onClick={() => login('alice@soundsync.dev', 'alice12345').catch(() => {})}>login</button>
      <button onClick={() => register('alice', 'alice@soundsync.dev', 'alice12345').catch(() => {})}>
        register
      </button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  )

describe('AuthContext', () => {
  beforeEach(() => {
    authApi.login.mockResolvedValue({ access_token: 'new.jwt.token', token_type: 'bearer', user: alice })
    authApi.register.mockResolvedValue(alice)
  })

  it('starts anonymous without calling the API when no token is stored', () => {
    renderProbe()
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
    expect(authApi.getMe).not.toHaveBeenCalled()
  })

  it('restores the session from a stored token', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockResolvedValue(alice)
    renderProbe()

    expect(screen.getByTestId('state')).toHaveTextContent('loading')
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))
    expect(authApi.getMe).toHaveBeenCalledTimes(1)
  })

  it('drops an invalid or expired stored token', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired.jwt')
    authApi.getMe.mockRejectedValue(apiError(401, 'INVALID_TOKEN', 'Invalid or expired token'))
    renderProbe()

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('anonymous'))
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('keeps the stored token and retries while the server is unreachable', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      localStorage.setItem(TOKEN_KEY, 'stored.jwt')
      authApi.getMe
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(apiError(503, 'SERVICE_UNAVAILABLE', 'Down'))
        .mockResolvedValue(alice)
      renderProbe()

      await waitFor(() => expect(authApi.getMe).toHaveBeenCalledTimes(1))
      expect(screen.getByTestId('state')).toHaveTextContent('loading')
      expect(localStorage.getItem(TOKEN_KEY)).toBe('stored.jwt')

      await act(() => vi.advanceTimersByTimeAsync(1_000))
      await act(() => vi.advanceTimersByTimeAsync(2_000))
      await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))
      expect(authApi.getMe).toHaveBeenCalledTimes(3)
      expect(localStorage.getItem(TOKEN_KEY)).toBe('stored.jwt')
    } finally {
      vi.useRealTimers()
    }
  })

  it('login persists the JWT client-side and sets the user', async () => {
    renderProbe()
    await userEvent.click(screen.getByText('login'))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))
    expect(authApi.login).toHaveBeenCalledWith({ email: 'alice@soundsync.dev', password: 'alice12345' })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.jwt.token')
    expect(authApi.getMe).not.toHaveBeenCalled()
  })

  it('failed login stores nothing', async () => {
    authApi.login.mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'))
    renderProbe()
    await userEvent.click(screen.getByText('login'))

    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('register creates the account then logs in', async () => {
    renderProbe()
    await userEvent.click(screen.getByText('register'))

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))
    expect(authApi.register).toHaveBeenCalledWith({
      username: 'alice',
      email: 'alice@soundsync.dev',
      password: 'alice12345',
    })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.jwt.token')
  })

  it('logout clears the token and the user', async () => {
    renderProbe()
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))

    await userEvent.click(screen.getByText('logout'))
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('logs out when any API call reports the session is unauthorized', async () => {
    renderProbe()
    await userEvent.click(screen.getByText('login'))
    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('user:alice'))

    act(() => window.dispatchEvent(new Event('soundsync:unauthorized')))
    expect(screen.getByTestId('state')).toHaveTextContent('anonymous')
  })
})
