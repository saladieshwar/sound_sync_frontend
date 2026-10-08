import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../../api/auth'
import { TOKEN_KEY } from '../../api/client'
import { apiError, renderAuthRoutes } from '../../testUtils'

vi.mock('../../api/auth', () => ({ login: vi.fn(), register: vi.fn(), getMe: vi.fn() }))
vi.mock('../../api/health', () => ({ getHealth: vi.fn(() => Promise.resolve({ status: 'ok' })) }))

const newUser = { id: 9, username: 'carol', email: 'carol@soundsync.dev', is_admin: false }

async function submitRegister({ username = 'carol', email = 'carol@soundsync.dev', password = 'carol12345' } = {}) {
  await userEvent.type(screen.getByTestId('register-username'), username)
  await userEvent.type(screen.getByTestId('register-email'), email)
  await userEvent.type(screen.getByTestId('register-password'), password)
  await userEvent.click(screen.getByTestId('register-submit'))
}

describe('RegisterPage', () => {
  beforeEach(() => {
    authApi.register.mockResolvedValue(newUser)
    authApi.login.mockResolvedValue({ access_token: 'new.jwt.token', token_type: 'bearer', user: newUser })
  })

  it('registers, logs in, stores the JWT, and lands on Home', async () => {
    renderAuthRoutes('/register')
    await submitRegister()

    expect(await screen.findByText('Home page')).toBeInTheDocument()
    expect(authApi.register).toHaveBeenCalledWith({
      username: 'carol',
      email: 'carol@soundsync.dev',
      password: 'carol12345',
    })
    expect(authApi.login).toHaveBeenCalledWith({ email: 'carol@soundsync.dev', password: 'carol12345' })
    expect(localStorage.getItem(TOKEN_KEY)).toBe('new.jwt.token')
  })

  it('shows the duplicate-email error from the BE', async () => {
    authApi.register.mockRejectedValue(
      apiError(409, 'EMAIL_ALREADY_REGISTERED', 'An account with this email already exists'),
    )
    renderAuthRoutes('/register')
    await submitRegister()

    expect(await screen.findByRole('alert')).toHaveTextContent('An account with this email already exists')
    expect(authApi.login).not.toHaveBeenCalled()
    expect(screen.getByTestId('current-path')).toHaveTextContent('/register')
  })

  it('shows the field-level reason for BE validation errors', async () => {
    authApi.register.mockRejectedValue(
      apiError(422, 'VALIDATION_ERROR', 'Request validation failed', {
        errors: [{ loc: ['body', 'password'], msg: 'Value error, Password must be at most 72 bytes' }],
      }),
    )
    renderAuthRoutes('/register')
    await submitRegister()

    expect(await screen.findByText('password: Password must be at most 72 bytes')).toBeInTheDocument()
  })

  it('enforces password length limits in the form', () => {
    renderAuthRoutes('/register')
    const password = screen.getByTestId('register-password')
    expect(password).toHaveAttribute('minLength', '8')
    expect(password).toHaveAttribute('maxLength', '72')
  })

  it('names its fields for screen readers and password managers', () => {
    renderAuthRoutes('/register')
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveAttribute('autocomplete', 'username')
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('autocomplete', 'email')
    expect(screen.getByLabelText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })
})
