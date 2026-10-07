import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading, offline } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div role="status" className="p-8 text-neutral-400">
        {offline ? 'Can’t reach the server. Reconnecting…' : 'Loading…'}
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
