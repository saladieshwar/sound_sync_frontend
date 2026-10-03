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
    <header className="flex items-center gap-6 border-b border-neutral-800 px-6 py-3">
      <Link to="/" className="text-xl font-bold text-emerald-400">
        SoundSync
      </Link>
      <nav className="flex gap-4">
        <NavLink to="/" end className={linkClass}>
          Home
        </NavLink>
        <NavLink to="/room" className={linkClass}>
          Musical Room
        </NavLink>
        {user?.is_admin && (
          <NavLink to="/admin" className={linkClass}>
            Admin
          </NavLink>
        )}
      </nav>
      <SearchForm key={urlQuery} initialQuery={urlQuery} />
      <div className="flex items-center gap-3">
        <BackendStatus />
        <span className="text-sm text-neutral-300">{user?.username}</span>
        <button onClick={logout} className="text-sm text-neutral-400 hover:text-white">
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
    <form onSubmit={onSearch} role="search" className="ml-auto w-full max-w-sm">
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
