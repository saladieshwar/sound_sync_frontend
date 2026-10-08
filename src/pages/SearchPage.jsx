import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchSongs } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import SongList from '../components/songs/SongList'
import { SearchIcon } from '../components/ui/icons'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const fetcher = useCallback(() => searchSongs(q), [q])
  const { data, loading, error, reload } = useApiQuery(q ? fetcher : null)

  if (!q) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 pt-16 text-center motion-safe:animate-rise">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/5 bg-neutral-900 text-emerald-400 shadow-xl shadow-black/40">
          <SearchIcon className="h-7 w-7" />
        </span>
        <p className="text-neutral-400">Type in the search bar to find songs, artists, or albums.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-end gap-x-3 gap-y-1 motion-safe:animate-rise">
        <div className="min-w-0">
          <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300/90 uppercase">Search</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight break-words text-white sm:text-3xl">
            Results for “{q}”
          </h1>
        </div>
        {data && (
          <p className="mb-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">
            {data.length} {data.length === 1 ? 'song' : 'songs'}
          </p>
        )}
      </header>
      <div className="motion-safe:animate-rise">
        <SongList
          songs={data ?? []}
          loading={loading}
          error={error}
          onRetry={reload}
          emptyMessage={`No songs match “${q}”.`}
        />
      </div>
    </div>
  )
}
