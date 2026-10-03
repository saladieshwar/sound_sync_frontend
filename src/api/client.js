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

/** Extracts the BE structured error: { error: { code, message, details } } */
export const getApiError = (error) =>
  error.response?.data?.error ?? { code: 'NETWORK_ERROR', message: 'Unable to reach server' }

export default client
