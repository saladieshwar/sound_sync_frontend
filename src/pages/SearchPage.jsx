import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { searchSongs } from '../api/songs'
import SongList from '../components/songs/SongList'

export default function SearchPage() {
  const [params] = useSearchParams()
  const q = params.get('q') ?? ''
  const [results, setResults] = useState([])

  useEffect(() => {
    if (q) searchSongs(q).then(setResults)
  }, [q])

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Results for “{q}”</h1>
      <SongList songs={results} />
    </div>
  )
}
