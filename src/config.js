// Without explicit env vars, the API is assumed on port 8000 of whatever host served the page,
// so a second device opening http://<LAN-IP>:5173 talks to the same machine's backend.
const pageHost = globalThis.location?.hostname || 'localhost'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || `http://${pageHost}:8000`
export const WS_BASE_URL = import.meta.env.VITE_WS_BASE_URL || API_BASE_URL.replace(/^http/, 'ws')

export const mediaUrl = (path) => {
  if (!path) return null
  return path.startsWith('http') ? path : `${API_BASE_URL}${path}`
}
