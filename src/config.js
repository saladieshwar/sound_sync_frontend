export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL ?? 'ws://localhost:8000'

export const mediaUrl = (path) => {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`
}
