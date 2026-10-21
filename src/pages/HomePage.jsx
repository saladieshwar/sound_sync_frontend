import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAlbums, listCategories, listSongs } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import SectionRow from '../components/songs/SectionRow'
import SongList from '../components/songs/SongList'
import { useAuth } from '../context/AuthContext'
import { useLibrary } from '../context/LibraryContext'

function greeting(hour) {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

function SectionHeading({ children, count }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <h2 className="text-xl font-bold tracking-tight text-white">{children}</h2>
      {count > 0 && (
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">
          {count}
        </span>
      )}
    </div>
  )
}

const panelClass =
  'min-w-0 rounded-2xl border border-white/5 bg-neutral-900/40 p-3 shadow-xl shadow-black/20 motion-safe:animate-rise sm:p-4'

export default function HomePage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [hello] = useState(() => greeting(new Date().getHours()))
  const library = useLibrary()
  const categories = useApiQuery(listCategories)
  const albums = useApiQuery(listAlbums)
  const songs = useApiQuery(listSongs)

  const libraryLoading = library.status === 'idle' || library.status === 'loading'
  const likedSongs = library.likedSongs.map((l) => l.song)

  return (
    <div className="mx-auto max-w-7xl min-[1800px]:max-w-400">
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-violet-400/15 bg-linear-to-r from-violet-700/80 via-purple-900/70 to-[#1a1030]/80 px-6 py-7 shadow-2xl shadow-violet-950/40 motion-safe:animate-rise sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 right-10 h-56 w-56 rounded-full bg-fuchsia-400/25 blur-3xl"
        />
        <svg
          aria-hidden="true"
          viewBox="0 0 420 120"
          className="pointer-events-none absolute top-6 right-6 hidden h-28 w-[28rem] text-violet-200/80 lg:block"
        >
          <path
            d="M8 78c28-8 36-46 62-46s34 58 64 42 40-62 72-48 34 54 66 40 42-50 70-36 28 28 48 18"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path d="M250 28v22M244 34l6-8 6 8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M330 18v20M324 24l6-8 6 8" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="M150 22v16M145 27l5-7 5 7" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-violet-200/90">{hello}</p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {user?.username ? `Welcome back, ${user.username}` : 'Welcome back'}
            </p>
            <p className="mt-2 max-w-lg text-sm text-neutral-400 sm:text-base">
              Pick up where you left off, explore a category, or dive into an album.
            </p>
          </div>
          <dl className="flex gap-2 sm:gap-3">
            {[
              ['Songs', songs.data?.length],
              ['Albums', albums.data?.length],
              ['Liked', libraryLoading ? undefined : likedSongs.length],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-20 rounded-2xl border border-violet-300/15 bg-black/25 px-4 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-violet-300/30"
              >
                <dt className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase">{label}</dt>
                <dd className="mt-0.5 text-xl font-bold text-white tabular-nums">
                  {value ?? <span className="inline-block h-5 w-6 translate-y-0.5 rounded shimmer" />}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      <SectionRow
        title="Categories"
        variant="category"
        items={(categories.data ?? []).map((c) => ({ key: c, label: c }))}
        loading={categories.loading}
        error={categories.error}
        onRetry={categories.reload}
        onSelect={(item) => navigate(`/category/${encodeURIComponent(item.label)}`)}
      />
      <SectionRow
        title="Albums"
        items={(albums.data ?? []).map((a) => ({
          key: a.name,
          label: a.name,
          sublabel: a.artist,
          cover: a.cover_url,
        }))}
        loading={albums.loading}
        error={albums.error}
        onRetry={albums.reload}
        onSelect={(item) => navigate(`/album/${encodeURIComponent(item.label)}`)}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-label="Recently Played" className={panelClass}>
          <SectionHeading count={library.recentSongs.length}>Recently Played</SectionHeading>
          <SongList
            songs={library.recentSongs}
            loading={libraryLoading}
            error={library.error}
            onRetry={library.refresh}
            emptyMessage="Songs you play will show up here."
          />
        </section>
        <section aria-label="Liked Songs" className={panelClass}>
          <SectionHeading count={likedSongs.length}>Liked Songs</SectionHeading>
          <SongList
            songs={likedSongs}
            loading={libraryLoading}
            error={library.error}
            onRetry={library.refresh}
            emptyMessage="Tap ♥ on any song to like it."
          />
        </section>
      </div>

      <section className="mt-10 motion-safe:animate-rise" aria-label="All Songs">
        <SectionHeading count={songs.data?.length}>All Songs</SectionHeading>
        <SongList
          songs={songs.data ?? []}
          loading={songs.loading}
          error={songs.error}
          onRetry={songs.reload}
        />
      </section>
    </div>
  )
}
