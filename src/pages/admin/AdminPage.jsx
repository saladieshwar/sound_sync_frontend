import { useEffect, useState } from 'react'
import { listRooms, listUsers, uploadSong } from '../../api/admin'
import { getApiError } from '../../api/client'

const TABS = ['Upload Song', 'Users', 'Rooms']
const inputClass =
  'w-full rounded-md bg-neutral-800 px-3 py-2 outline-none focus:ring-2 focus:ring-emerald-500'

function UploadSongForm() {
  const [message, setMessage] = useState(null)

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    try {
      const song = await uploadSong(new FormData(form))
      setMessage(`Uploaded “${song.title}”`)
      form.reset()
    } catch (err) {
      setMessage(getApiError(err).message)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-3">
      <input name="title" required placeholder="Title" className={inputClass} />
      <input name="artist" required placeholder="Artist" className={inputClass} />
      <input name="album" placeholder="Album (optional)" className={inputClass} />
      <input name="category" required placeholder="Category (melody, love, motivation, sad…)" className={inputClass} />
      <input name="duration_seconds" type="number" min={0} required placeholder="Duration (seconds)" className={inputClass} />
      <label className="text-sm text-neutral-400">
        Audio file
        <input name="audio_file" type="file" accept="audio/*" required className="mt-1 block max-w-full" />
      </label>
      <label className="text-sm text-neutral-400">
        Cover image (optional)
        <input name="cover_file" type="file" accept="image/*" className="mt-1 block max-w-full" />
      </label>
      <button className="rounded-md bg-emerald-500 py-2 font-semibold text-black hover:bg-emerald-400">
        Upload
      </button>
      {message && <p className="text-sm text-neutral-300">{message}</p>}
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

function UsersTable() {
  const [users, setUsers] = useState([])
  useEffect(() => {
    listUsers().then(setUsers)
  }, [])

  return (
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
        {users.map((u) => (
          <tr key={u.id} className="border-t border-neutral-800">
            <td className="py-2">{u.id}</td>
            <td>{u.username}</td>
            <td>{u.email}</td>
            <td>{u.is_admin ? 'Admin' : 'User'}</td>
            <td>{new Date(u.created_at).toLocaleDateString()}</td>
          </tr>
        ))}
      </tbody>
    </TableScroll>
  )
}

function RoomsTable() {
  const [rooms, setRooms] = useState([])
  useEffect(() => {
    listRooms().then(setRooms)
  }, [])

  return (
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
        {rooms.map((r) => (
          <tr key={r.id} className="border-t border-neutral-800">
            <td className="py-2 font-mono">{r.id}</td>
            <td>{r.name}</td>
            <td>{r.participants.length}</td>
            <td>{r.is_playing ? 'Yes' : 'No'}</td>
            <td>{new Date(r.created_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </TableScroll>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold sm:text-3xl">Admin Panel</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-1.5 text-sm ${tab === t ? 'bg-white text-black' : 'bg-neutral-800 text-neutral-300'}`}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Upload Song' && <UploadSongForm />}
      {tab === 'Users' && <UsersTable />}
      {tab === 'Rooms' && <RoomsTable />}
    </div>
  )
}
