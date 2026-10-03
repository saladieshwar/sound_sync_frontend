import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setToken(null)
    setUser(null)
  }, [])

  useEffect(() => {
    if (!token) return
    authApi
      .getMe()
      .then(setUser)
      .catch(logout)
      .finally(() => setLoading(false))
  }, [token, logout])

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

  const value = useMemo(
    () => ({ token, user, loading, isAuthenticated: Boolean(user), login, register, logout }),
    [token, user, loading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
