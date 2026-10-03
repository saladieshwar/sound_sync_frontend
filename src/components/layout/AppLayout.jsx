import { Outlet } from 'react-router-dom'
import FooterPlayer from '../player/FooterPlayer'
import Navbar from './Navbar'

export default function AppLayout() {
  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="flex-1 overflow-y-auto px-6 py-6 pb-28">
        <Outlet />
      </main>
      <FooterPlayer />
    </div>
  )
}
