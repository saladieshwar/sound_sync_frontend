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
      <header className="relative mb-8 overflow-hidden rounded-3xl border border-white/5 bg-linear-to-br from-emerald-500/15 via-neutral-900/60 to-neutral-900/30 px-6 py-7 shadow-2xl shadow-black/30 motion-safe:animate-rise sm:px-8 sm:py-9">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-10 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgb(255_255_255/0.05)_1px,transparent_1px)] mask-l-from-0% mask-l-to-60% bg-size-[18px_18px]" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-300/90">{hello}</p>
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
                className="min-w-20 rounded-2xl border border-white/5 bg-neutral-950/40 px-4 py-3 backdrop-blur-sm transition-colors duration-200 hover:border-white/10"
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
