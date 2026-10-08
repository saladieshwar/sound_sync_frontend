import { useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import BackendStatus from './BackendStatus'

const linkClass = ({ isActive }) =>
  `text-sm font-medium ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const urlQuery =
    location.pathname === '/search' ? (new URLSearchParams(location.search).get('q') ?? '') : ''

  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-neutral-800 px-4 py-3 sm:gap-x-6 sm:px-6">
      <Link to="/" className="text-lg font-bold text-emerald-400 sm:text-xl">
        SoundSync
      </Link>
      <nav className="flex gap-3 sm:gap-4">
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
      <div className="ml-auto flex items-center gap-2 sm:gap-3 md:ml-0">
        <BackendStatus compact />
        <span className="hidden max-w-32 truncate text-sm text-neutral-300 lg:inline">
          {user?.username}
        </span>
        <button
          onClick={logout}
          className="rounded px-2 py-1.5 text-sm text-neutral-400 hover:bg-neutral-800 hover:text-white"
        >
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
      className="order-last w-full md:order-none md:ml-auto md:w-auto md:max-w-sm md:flex-1"
    >
      <input
        data-testid="navbar-search"
        type="search"
        aria-label="Search songs"
        maxLength={100}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search songs, artists, albums"
        className="w-full rounded-full bg-neutral-800 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
      />
    </form>
  )
}
