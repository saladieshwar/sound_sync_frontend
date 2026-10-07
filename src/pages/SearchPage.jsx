import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchSongs } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import SongList from '../components/songs/SongList'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = (params.get('q') ?? '').trim()
  const fetcher = useCallback(() => searchSongs(q), [q])
  const { data, loading, error, reload } = useApiQuery(q ? fetcher : null)

  if (!q) {
    return <p className="text-neutral-400">Type in the search bar to find songs, artists, or albums.</p>
  }

  return (
    <div>
      <h1 className="mb-1 text-xl font-bold break-words sm:text-2xl">Results for “{q}”</h1>
      {data && (
        <p className="mb-4 text-sm text-neutral-400">
          {data.length} {data.length === 1 ? 'song' : 'songs'}
        </p>
      )}
      <SongList
        songs={data ?? []}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage={`No songs match “${q}”.`}
      />
    </div>
  )
}
