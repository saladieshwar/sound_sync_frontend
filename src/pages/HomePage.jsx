import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listAlbums, listCategories, listSongs } from '../api/songs'
import SectionRow from '../components/songs/SectionRow'
import SongList from '../components/songs/SongList'
import { useLibrary } from '../context/LibraryContext'

export default function HomePage() {
  const navigate = useNavigate()
  const { likedSongs, recentlyPlayed } = useLibrary()
  const [categories, setCategories] = useState([])
  const [albums, setAlbums] = useState([])
  const [songs, setSongs] = useState([])

  useEffect(() => {
    listCategories().then(setCategories)
    listAlbums().then(setAlbums)
    listSongs().then(setSongs)
  }, [])

  return (
    <div>
      <SectionRow
        title="Categories"
        items={categories.map((c) => ({ key: c, label: c }))}
        onSelect={(item) => navigate(`/category/${encodeURIComponent(item.label)}`)}
      />
      <SectionRow
        title="Albums"
        items={albums.map((a) => ({ key: a.name, label: a.name, sublabel: a.artist, cover: a.cover_url }))}
        onSelect={(item) => navigate(`/album/${encodeURIComponent(item.label)}`)}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Recently Played</h2>
          <SongList songs={recentlyPlayed.map((r) => r.song)} />
        </section>
        <section>
          <h2 className="mb-3 text-lg font-semibold">Liked Songs</h2>
          <SongList songs={likedSongs.map((l) => l.song)} />
        </section>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold">All Songs</h2>
        <SongList songs={songs} />
      </section>
    </div>
  )
}
