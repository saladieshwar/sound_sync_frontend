import { describe, expect, it, vi } from 'vitest'
import client, { getApiError, TOKEN_KEY } from './client'

const respondWith = (status, data = {}) => async (config) => {
  const response = { data, status, statusText: String(status), headers: {}, config }
  if (status >= 400) {
    throw Object.assign(new Error(`Request failed with status ${status}`), {
      response,
      config,
      isAxiosError: true,
    })
  }
  return response
}

describe('API client', () => {
  it('attaches the stored JWT as a Bearer token', async () => {
    localStorage.setItem(TOKEN_KEY, 'abc.def.ghi')
    let sentHeader
    await client.get('/auth/me', {
      adapter: async (config) => {
        sentHeader = config.headers.Authorization
        return respondWith(200)(config)
      },
    })
    expect(sentHeader).toBe('Bearer abc.def.ghi')
  })

  it('sends no Authorization header when logged out', async () => {
    let sentHeader = 'unset'
    await client.get('/health', {
      adapter: async (config) => {
        sentHeader = config.headers.Authorization
        return respondWith(200)(config)
      },
    })
    expect(sentHeader).toBeUndefined()
  })

  it('clears the token and broadcasts logout on a 401 response', async () => {
    localStorage.setItem(TOKEN_KEY, 'expired')
    const listener = vi.fn()
    window.addEventListener('soundsync:unauthorized', listener)

    await expect(client.get('/auth/me', { adapter: respondWith(401) })).rejects.toBeTruthy()

    expect(localStorage.getItem(TOKEN_KEY)).toBeNull()
    expect(listener).toHaveBeenCalledTimes(1)
    window.removeEventListener('soundsync:unauthorized', listener)
  })

  it('keeps the token on non-401 errors', async () => {
    localStorage.setItem(TOKEN_KEY, 'valid')
    await expect(client.get('/x', { adapter: respondWith(500) })).rejects.toBeTruthy()
    expect(localStorage.getItem(TOKEN_KEY)).toBe('valid')
  })
})

describe('getApiError', () => {
  it('returns the BE structured error as-is', () => {
    const error = { response: { data: { error: { code: 'EMAIL_ALREADY_REGISTERED', message: 'taken', details: {} } } } }
    expect(getApiError(error)).toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED', message: 'taken' })
  })

  it('surfaces the first field error for validation failures', () => {
    const error = {
      response: {
        data: {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Request validation failed',
            details: { errors: [{ loc: ['body', 'password'], msg: 'Value error, Password must be at most 72 bytes' }] },
          },
        },
      },
    }
    expect(getApiError(error).message).toBe('password: Password must be at most 72 bytes')
  })

  it('reports a network error when there is no response', () => {
    expect(getApiError(new Error('Network Error'))).toEqual({
      code: 'NETWORK_ERROR',
      message: 'Unable to reach server',
    })
  })
})
