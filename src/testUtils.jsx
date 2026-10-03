import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import AdminRoute from './routes/AdminRoute'
import ProtectedRoute from './routes/ProtectedRoute'

/** Builds the error shape axios rejects with for a BE structured error response. */
export const apiError = (status, code, message, details = {}) =>
  Object.assign(new Error(message), {
    response: { status, data: { error: { code, message, details } } },
  })

function CurrentPath() {
  const location = useLocation()
  return <div data-testid="current-path">{location.pathname}</div>
}

/** Renders the auth-relevant route tree from App.jsx with lightweight page stand-ins. */
export function renderAuthRoutes(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route element={<ProtectedRoute />}>
            <Route index element={<h1>Home page</h1>} />
            <Route path="room" element={<h1>Room page</h1>} />
            <Route element={<AdminRoute />}>
              <Route path="admin" element={<h1>Admin page</h1>} />
            </Route>
          </Route>
        </Routes>
        <CurrentPath />
      </AuthProvider>
    </MemoryRouter>,
  )
}
