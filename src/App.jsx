import { Route, Routes } from 'react-router-dom'
import AppLayout from './components/layout/AppLayout'
import AdminPage from './pages/admin/AdminPage'
import LoginPage from './pages/auth/LoginPage'
import RegisterPage from './pages/auth/RegisterPage'
import BrowsePage from './pages/BrowsePage'
import HomePage from './pages/HomePage'
import NotFoundPage from './pages/NotFoundPage'
import NowPlayingPage from './pages/NowPlayingPage'
import ProfilePage from './pages/ProfilePage'
import RoomLandingPage from './pages/room/RoomLandingPage'
import RoomPage from './pages/room/RoomPage'
import SearchPage from './pages/SearchPage'
import AdminRoute from './routes/AdminRoute'
import ProtectedRoute from './routes/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<HomePage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="category/:name" element={<BrowsePage mode="category" />} />
          <Route path="album/:name" element={<BrowsePage mode="album" />} />
          <Route path="now-playing" element={<NowPlayingPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="room" element={<RoomLandingPage />} />
          <Route path="room/:roomId" element={<RoomPage />} />
          <Route element={<AdminRoute />}>
            <Route path="admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
