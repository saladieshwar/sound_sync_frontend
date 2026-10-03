import { useNavigate } from 'react-router-dom'
import { listAlbums, listCategories, listSongs } from '../api/songs'
import useApiQuery from '../api/useApiQuery'
import SectionRow from '../components/songs/SectionRow'
import SongList from '../components/songs/SongList'
import { useLibrary } from '../context/LibraryContext'

export default function HomePage() {
  const navigate = useNavigate()
  const library = useLibrary()
  const categories = useApiQuery(listCategories)
  const albums = useApiQuery(listAlbums)
  const songs = useApiQuery(listSongs)

  const libraryLoading = library.status === 'idle' || library.status === 'loading'

  return (
    <div>
      <SectionRow
        title="Categories"
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

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Recently Played">
          <h2 className="mb-3 text-lg font-semibold">Recently Played</h2>
          <SongList
            songs={library.recentSongs}
            loading={libraryLoading}
            error={library.error}
            onRetry={library.refresh}
            emptyMessage="Songs you play will show up here."
          />
        </section>
        <section aria-label="Liked Songs">
          <h2 className="mb-3 text-lg font-semibold">Liked Songs</h2>
          <SongList
            songs={library.likedSongs.map((l) => l.song)}
            loading={libraryLoading}
            error={library.error}
            onRetry={library.refresh}
            emptyMessage="Tap ♥ on any song to like it."
          />
        </section>
      </div>

      <section className="mt-8" aria-label="All Songs">
        <h2 className="mb-3 text-lg font-semibold">All Songs</h2>
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
