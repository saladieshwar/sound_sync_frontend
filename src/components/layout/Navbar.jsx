import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { LogoutIcon, SearchIcon } from '../ui/icons'
import BackendStatus from './BackendStatus'

const linkClass = ({ isActive }) =>
  `rounded-full px-3 py-1.5 text-sm font-medium transition duration-200 active:scale-95 ${
    isActive
      ? 'bg-white/10 text-white shadow-inner shadow-white/5'
      : 'text-neutral-400 hover:bg-white/5 hover:text-white'
  }`

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const urlQuery =
    location.pathname === '/search' ? (new URLSearchParams(location.search).get('q') ?? '') : ''

  return (
    <header className="relative z-10 flex flex-wrap items-center gap-x-2 gap-y-2.5 border-b border-white/5 bg-neutral-950/80 px-4 py-3 backdrop-blur-xl sm:gap-x-5 sm:px-6">
      <Link to="/" className="group flex items-center gap-2 rounded-lg">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 items-end justify-center gap-0.5 rounded-lg bg-linear-to-br from-emerald-400 to-emerald-600 pb-2 shadow-lg shadow-emerald-500/25 transition-transform duration-300 group-hover:scale-105"
        >
          {[0.45, 0.9, 0.65].map((h, i) => (
            <span
              key={i}
              style={{ height: `${h * 14}px`, animationDelay: `${i * 0.15}s` }}
              className="w-0.75 origin-bottom rounded-full bg-neutral-950/85 motion-safe:group-hover:animate-eq"
            />
          ))}
        </span>
        <span className="sr-only bg-linear-to-r min-[400px]:not-sr-only from-emerald-300 to-emerald-500 bg-clip-text text-lg font-bold tracking-tight text-transparent sm:text-xl">
          SoundSync
        </span>
      </Link>
      <nav className="flex gap-0.5 sm:gap-1">
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/room" aria-label="Musical Room" className={linkClass}>
          <span className="sm:hidden">Room</span>
          <span className="hidden sm:inline">Musical Room</span>
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        )}
      </nav>
      <SearchForm key={urlQuery} initialQuery={urlQuery} />
      <div className="ml-auto flex items-center gap-2 sm:gap-3 lg:ml-0">
        <BackendStatus compact />
        {user?.username && (
          <span className="hidden items-center gap-2 lg:flex">
            <span
              aria-hidden="true"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-neutral-600 to-neutral-800 text-xs font-semibold text-white uppercase ring-1 ring-white/10"
            >
              {user.username[0]}
            </span>
            <span className="max-w-32 truncate text-sm font-medium text-neutral-200">{user.username}</span>
          </span>
        )}
        <button
          onClick={logout}
          className="group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-neutral-400 transition duration-200 hover:bg-white/5 hover:text-white active:scale-95"
        >
          <LogoutIcon className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-0.5" />
          Logout
        </button>
      </div>
    </header>
  )
}

/** Keyed by the URL query so it resets to the current search on navigation. */
function SearchForm({ initialQuery }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState(initialQuery)

  const onSearch = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  return (
    <form
      onSubmit={onSearch}
      role="search"
      className="group relative order-last w-full lg:order-none lg:ml-auto lg:w-auto lg:max-w-sm lg:flex-1"
    >
      <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-neutral-500 transition duration-200 group-focus-within:scale-110 group-focus-within:-rotate-12 group-focus-within:text-emerald-400" />
      <input
        data-testid="navbar-search"
        type="search"
        aria-label="Search songs"
        maxLength={100}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums"
        className="w-full rounded-full border border-white/5 bg-white/5 py-2 pr-4 pl-10 text-sm text-white placeholder-neutral-500 outline-none transition duration-200 hover:border-white/10 hover:bg-white/[0.07] focus:border-emerald-500/50 focus:bg-neutral-900 focus:ring-4 focus:ring-emerald-500/15"
      />
    </form>
  )
}
