import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)
const AUTH_RETRY_MAX_MS = 10_000

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))
  const [offline, setOffline] = useState(false)

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  // Validate a token restored from a previous session; tokens from login() arrive with their user.
  // Only a definite rejection (4xx) ends the session; if the server is unreachable or erroring,
  // keep the token and retry so a backend restart does not log everyone out.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return undefined
    let cancelled = false
    let timer
    let attempt = 0
    const check = () =>
      authApi
        .getMe()
        .then((me) => {
          if (cancelled) return
          setUser(me)
          setOffline(false)
          setLoading(false)
        })
        .catch((error) => {
          if (cancelled) return
          const status = error.response?.status
          if (status && status < 500) {
            logout()
            setOffline(false)
            setLoading(false)
            return
          }
          setOffline(true)
          timer = setTimeout(check, Math.min(1000 * 2 ** attempt, AUTH_RETRY_MAX_MS))
          attempt += 1
        })
    check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [logout])

  useEffect(() => {
    window.addEventListener('soundsync:unauthorized', logout)
    return () => window.removeEventListener('soundsync:unauthorized', logout)
  }, [logout])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password })
    localStorage.setItem(TOKEN_KEY, data.access_token)
    setToken(data.access_token)
    setUser(data.user)
    return data.user
  }, [])

  const register = useCallback(
    async (username, email, password) => {
      await authApi.register({ username, email, password })
      return login(email, password)
    },
    [login],
  )

  /** After a profile change: the server's updated user replaces the one shown everywhere. */
  const updateUser = useCallback((updated) => setUser(updated), [])

  const value = useMemo(
    () => ({ token, user, loading, offline, isAuthenticated: Boolean(user), login, register, logout, updateUser }),
    [token, user, loading, offline, login, register, logout, updateUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
