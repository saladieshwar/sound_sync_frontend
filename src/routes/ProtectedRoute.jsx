import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function ProtectedRoute() {
  const { isAuthenticated, loading, offline } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
        <span
          aria-hidden="true"
          className={`h-8 w-8 rounded-full border-2 border-neutral-800 motion-safe:animate-spin ${offline ? 'border-t-amber-400' : 'border-t-emerald-400'}`}
        />
        <div role="status" className="text-sm text-neutral-400">
          {offline ? 'Can’t reach the server. Reconnecting…' : 'Loading…'}
        </div>
      </div>
    )
  }
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
