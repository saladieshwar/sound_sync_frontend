import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="relative flex min-h-[60vh] flex-col items-center justify-center gap-5 overflow-hidden px-4 text-center motion-safe:animate-rise">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl"
      />
      <p
        aria-hidden="true"
        className="relative bg-linear-to-b from-white to-neutral-600 bg-clip-text text-8xl font-extrabold tracking-tighter text-transparent sm:text-9xl"
      >
        404
      </p>
      <h1 className="relative text-2xl font-bold text-white sm:text-3xl">Page not found</h1>
      <p className="relative max-w-sm text-neutral-400">This page skipped a beat. Let’s get you back to the music.</p>
      <Link
        to="/"
        className="relative rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/25 transition duration-200 hover:scale-[1.03] hover:bg-emerald-400 active:scale-95"
      >
        Back to Home
      </Link>
    </div>
  )
}
