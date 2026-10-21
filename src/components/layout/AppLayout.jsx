import { useEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import FooterPlayer from '../player/FooterPlayer'
import Navbar from './Navbar'

export default function AppLayout() {
  const { pathname } = useLocation()
  const main = useRef(null)

  // <main> is the scroll container, so the browser won't reset it on navigation.
  useEffect(() => {
    main.current?.scrollTo?.(0, 0)
  }, [pathname])

  return (
    <div className="relative flex h-full flex-col">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-0 right-0 h-[32rem] w-[32rem] translate-x-1/4 -translate-y-1/3 rounded-full bg-violet-600/25 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed bottom-16 left-0 h-80 w-80 -translate-x-1/3 rounded-full bg-fuchsia-800/20 blur-3xl"
      />
      <Navbar />
      <main
        ref={main}
        className="relative min-w-0 flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(ellipse_70%_45%_at_85%_-8%,rgb(139_92_246/0.16),transparent)] px-4 pt-4 pb-32 sm:px-6 sm:pt-6 md:pb-28"
      >
        <div key={pathname} className="min-h-full motion-safe:animate-fade-in">
          <Outlet />
        </div>
      </main>
      <FooterPlayer />
    </div>
  )
}
