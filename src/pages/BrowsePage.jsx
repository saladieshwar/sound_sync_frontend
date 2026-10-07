import { useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { songsByAlbum, songsByCategory } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import SongList from '../components/songs/SongList'

/** mode: 'category' | 'album' */
export default function BrowsePage({ mode }) {
  const { name } = useParams()
  const fetcher = useCallback(
    () => (mode === 'album' ? songsByAlbum(name) : songsByCategory(name)),
    [mode, name],
  )
  const { data, loading, error, reload } = useApiQuery(fetcher)

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-neutral-400">{mode}</p>
      <h1 className="mb-6 text-2xl font-bold capitalize break-words sm:text-3xl">{name}</h1>
      <SongList
        songs={data ?? []}
        loading={loading}
        error={error}
        onRetry={reload}
        emptyMessage={`No songs in this ${mode} yet.`}
      />
    </div>
  )
}
