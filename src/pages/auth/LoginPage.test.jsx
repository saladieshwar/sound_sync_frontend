import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import { TOKEN_KEY } from '../../api/client'
import { apiError, renderAuthRoutes } from '../../testUtils'

vi.mock('../../api/auth', () => ({ login: vi.fn(), register: vi.fn(), getMe: vi.fn() }))
vi.mock('../../api/health', () => ({ getHealth: vi.fn(() => Promise.resolve({ status: 'ok' })) }))

const alice = { id: 2, username: 'alice', email: 'alice@soundsync.dev', is_admin: false }

async function submitLogin(email = 'alice@soundsync.dev', password = 'alice12345') {
  await userEvent.type(screen.getByTestId('login-email'), email)
  await userEvent.type(screen.getByTestId('login-password'), password)
  await userEvent.click(screen.getByTestId('login-submit'))
}

describe('LoginPage', () => {
  beforeEach(() => {
    authApi.login.mockResolvedValue({ access_token: 'new.jwt.token', token_type: 'bearer', user: alice })
  })

  it('logs in with the BE endpoint, stores the JWT, and lands on Home', async () => {
    renderAuthRoutes('/login')
    await submitLogin()

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(authApi.login).toHaveBeenCalledWith({ email: 'alice@soundsync.dev', password: 'alice12345' })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.jwt.token')
  })

  it('returns the user to the protected page they originally requested', async () => {
    renderAuthRoutes('/room')
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')

    await submitLogin()
    expect(await screen.findByText('Room page')).toBeInTheDocument()
  })

  it('shows the BE error message for wrong credentials and stays on /login', async () => {
    authApi.login.mockRejectedValue(apiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password'))
    renderAuthRoutes('/login')
    await submitLogin('alice@soundsync.dev', 'wrong-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(screen.getByTestId('current-path')).toHaveTextContent('/login')
    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
  })

  it('shows a network error when the BE is unreachable', async () => {
    authApi.login.mockRejectedValue(new Error('Network Error'))
    renderAuthRoutes('/login')
    await submitLogin()

    expect(await screen.findByText('Unable to reach server')).toBeInTheDocument()
  })

  it('names its fields for screen readers and password managers', () => {
    renderAuthRoutes('/login')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'current-password')
  })

  it('shows and hides the password with the eye button without submitting', async () => {
    renderAuthRoutes('/login')
    const password = screen.getByTestId('login-password')
    await userEvent.type(password, 'alice12345')
    expect(password).toHaveAttribute('type', 'password')

    await userEvent.click(screen.getByRole('button', { name: 'Show password' }))
    expect(password).toHaveAttribute('type', 'text')
    expect(password).toHaveValue('alice12345')
    expect(screen.getByRole('button', { name: 'Hide password' })).toHaveAttribute('aria-pressed', 'true')

    await userEvent.click(screen.getByRole('button', { name: 'Hide password' }))
    expect(password).toHaveAttribute('type', 'password')
    expect(authApi.login).not.toHaveBeenCalled()
  })

  it('redirects an already logged-in user away from /login', async () => {
    localStorage.setItem(TOKEN_KEY, 'stored.jwt')
    authApi.getMe.mockResolvedValue(alice)
    renderAuthRoutes('/login')

    expect(await screen.findByText('Home page')).toBeInTheDocument()
  })
})
