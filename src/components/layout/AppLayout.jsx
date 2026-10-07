import { Outlet } from 'react-router-dom'
import FooterPlayer from '../player/FooterPlayer'
import Navbar from './Navbar'

export default function AppLayout() {
  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-4 pb-32 sm:px-6 sm:pt-6 md:pb-28">
        <Outlet />
      </main>
      <FooterPlayer />
    </div>
  )
}
