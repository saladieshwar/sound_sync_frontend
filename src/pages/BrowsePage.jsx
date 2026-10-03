import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { songsByAlbum, songsByCategory } from '../api/songs'
import SongList from '../components/songs/SongList'

/** mode: 'category' | 'album' */
export default function BrowsePage({ mode }) {
  const { name } = useParams()
  const [songs, setSongs] = useState([])

  useEffect(() => {
    const fetcher = mode === 'album' ? songsByAlbum : songsByCategory
    fetcher(name).then(setSongs)
  }, [mode, name])

  return (
    <div>
      <p className="text-sm uppercase tracking-wide text-neutral-400">{mode}</p>
      <h1 className="mb-6 text-3xl font-bold capitalize">{name}</h1>
      <SongList songs={songs} />
    </div>
  )
}
