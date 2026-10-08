import { useCallback, useState } from 'react'
import { deleteSong, listRooms, listUsers, uploadSong } from '../../api/admin'
import { getApiError } from '../../api/client'
import { listSongs } from '../../api/songs'
import useApiQuery from '../../api/useApiQuery'
import LoadError from '../../components/songs/LoadError'
import { formatTime } from '../../utils/format'

const TABS = ['Upload Song', 'Songs', 'Users', 'Rooms']
const SONGS_PAGE = { limit: 200 }
const AUDIO_ACCEPT = '.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm'
const COVER_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif'
const inputClass =
  'w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500'
const fileClass =
  'mt-1 block max-w-full text-neutral-300 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-neutral-700 file:px-3 file:py-2 file:text-sm file:text-neutral-100 hover:file:bg-neutral-600'

function UploadSongForm() {
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setMessage(null)
    try {
      const song = await uploadSong(new FormData(form))
      setMessage({ ok: true, text: `Uploaded “${song.title}”` })
      form.reset()
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-3">
      <input name="title" aria-label="Title" required maxLength={200} placeholder="Title" className={inputClass} />
      <input name="artist" aria-label="Artist" required maxLength={200} placeholder="Artist" className={inputClass} />
      <input name="album" aria-label="Album" maxLength={200} placeholder="Album (optional)" className={inputClass} />
      <input
        name="category"
        aria-label="Category"
        required
        maxLength={50}
        placeholder="Category (melody, love, motivation, sad…)"
        className={inputClass}
      />
      <input
        name="duration_seconds"
        aria-label="Duration in seconds"
        type="number"
        min={0}
        required
        placeholder="Duration (seconds)"
        className={inputClass}
      />
      <label className="text-sm text-neutral-400">
        Audio file (MP3, WAV, OGG, M4A, AAC, FLAC, WebM; up to 50 MB)
        <input name="audio_file" type="file" accept={AUDIO_ACCEPT} required className={fileClass} />
      </label>
      <label className="text-sm text-neutral-400">
        Cover image (optional; JPG, PNG, WebP, GIF; up to 5 MB)
        <input name="cover_file" type="file" accept={COVER_ACCEPT} className={fileClass} />
      </label>
      <button
        disabled={busy}
        className="rounded-md bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`text-sm ${message.ok ? 'text-neutral-300' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
    </form>
  )
}

/** Wide tables scroll sideways on small screens instead of stretching the page. */
function TableScroll({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-left text-sm [&_td]:pr-4 [&_th]:pr-4">
        {children}
      </table>
    </div>
  )
}

/** Loading / error / empty handling shared by the admin lists. */
function QueryState({ query, empty, children }) {
  if (query.loading) return <p className="text-sm text-neutral-500">Loading…</p>
  if (query.error) return <LoadError error={query.error} onRetry={query.reload} />
  if (!query.data.length) return <p className="text-sm text-neutral-500">{empty}</p>
  return children
}

function SongsTable() {
  const fetchSongs = useCallback(() => listSongs(SONGS_PAGE), [])
  const songs = useApiQuery(fetchSongs)
  const [deleting, setDeleting] = useState(null)
  const [message, setMessage] = useState(null)

  const onDelete = async (song) => {
    if (!window.confirm(`Delete “${song.title}”? It is removed from every library and room.`)) return
    setDeleting(song.id)
    setMessage(null)
    try {
      await deleteSong(song.id)
      setMessage({ ok: true, text: `Deleted “${song.title}”` })
      songs.reload()
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err).message })
    } finally {
      setDeleting(null)
    }
  }

  return (
    <div>
      {message && (
        <p role={message.ok ? 'status' : 'alert'} className={`mb-3 text-sm ${message.ok ? 'text-neutral-300' : 'text-red-400'}`}>
          {message.text}
        </p>
      )}
      <QueryState query={songs} empty="No songs yet.">
        <TableScroll>
          <thead className="text-neutral-400">
            <tr>
              <th className="py-2">ID</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Category</th>
              <th>Length</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {songs.data?.map((s) => (
              <tr key={s.id} data-testid={`admin-song-${s.id}`} className="border-t border-neutral-800">
                <td className="py-2">{s.id}</td>
                <td>{s.title}</td>
                <td>{s.artist}</td>
                <td>{s.category}</td>
                <td className="tabular-nums">{formatTime(s.duration_seconds)}</td>
                <td className="text-right">
                  <button
                    onClick={() => onDelete(s)}
                    disabled={deleting !== null}
                    aria-label={`Delete ${s.title}`}
                    className="rounded px-2 py-1 text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deleting === s.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      </QueryState>
    </div>
  )
}

function UsersTable() {
  const users = useApiQuery(listUsers)
  return (
    <QueryState query={users} empty="No users yet.">
      <TableScroll>
        <thead className="text-neutral-400">
          <tr>
            <th className="py-2">ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Role</th>
            <th>Joined</th>
          </tr>
        </thead>
        <tbody>
          {users.data?.map((u) => (
            <tr key={u.id} data-testid={`admin-user-${u.id}`} className="border-t border-neutral-800">
              <td className="py-2">{u.id}</td>
              <td>{u.username}</td>
              <td>{u.email}</td>
              <td>{u.is_admin ? 'Admin' : 'User'}</td>
              <td>{new Date(u.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </TableScroll>
    </QueryState>
  )
}

function RoomsTable() {
  const rooms = useApiQuery(listRooms)
  return (
    <QueryState query={rooms} empty="No active rooms right now.">
      <TableScroll>
        <thead className="text-neutral-400">
          <tr>
            <th className="py-2">Room ID</th>
            <th>Name</th>
            <th>Participants</th>
            <th>Playing</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {rooms.data?.map((r) => (
            <tr key={r.id} data-testid={`admin-room-${r.id}`} className="border-t border-neutral-800">
              <td className="py-2 font-mono">{r.id}</td>
              <td>{r.name}</td>
              <td>{r.participants.length}</td>
              <td>{r.is_playing ? 'Yes' : 'No'}</td>
              <td>{new Date(r.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </TableScroll>
    </QueryState>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Admin Panel</h1>
      <div role="tablist" className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Upload Song' && <UploadSongForm />}
      {tab === 'Songs' && <SongsTable />}
      {tab === 'Users' && <UsersTable />}
      {tab === 'Rooms' && <RoomsTable />}
    </div>
  )
}
