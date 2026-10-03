import axios from 'axios'
import { API_BASE_URL } from '../config'

export const TOKEN_KEY = 'soundsync_token'

const client = axios.create({ baseURL: API_BASE_URL })

client.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY)
      window.dispatchEvent(new Event('soundsync:unauthorized'))
    }
    return Promise.reject(error)
  },
)

/**
 * Extracts the BE structured error: { error: { code, message, details } }.
 * For VALIDATION_ERROR, `message` is replaced by the first field error so forms can show it directly.
 */
export const getApiError = (error) => {
  const apiError = error.response?.data?.error
  if (!apiError) return { code: 'NETWORK_ERROR', message: 'Unable to reach server' }

  const firstFieldError = apiError.details?.errors?.[0]
  if (apiError.code === 'VALIDATION_ERROR' && firstFieldError) {
    const field = firstFieldError.loc?.at(-1)
    const msg = firstFieldError.msg.replace(/^Value error, /, '')
    return { ...apiError, message: field ? `${field}: ${msg}` : msg }
  }
  return apiError
}

export default client
