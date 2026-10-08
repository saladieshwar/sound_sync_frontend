import { Outlet, useLocation } from 'react-router-dom'
import FooterPlayer from '../player/FooterPlayer'
import Navbar from './Navbar'

export default function AppLayout() {
  const { pathname } = useLocation()
  return (
    <div className="flex h-full flex-col">
      <Navbar />
      <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(ellipse_80%_40%_at_50%_-10%,rgb(16_185_129/0.07),transparent)] px-4 pt-4 pb-32 sm:px-6 sm:pt-6 md:pb-28">
        <div key={pathname} className="min-h-full motion-safe:animate-fade-in">
          <Outlet />
        </div>
      </main>
      <FooterPlayer />
    </div>
  )
}
