import { useCallback, useEffect, useMemo, useState } from 'react'
import { deleteSong, listRooms, listUsers, uploadSong } from '../../api/admin'
import { getApiError } from '../../api/client'
import { listSongs } from '../../api/songs'
import useApiQuery from '../../api/useApiQuery'
import CoverImage from '../../components/songs/CoverImage'
import LoadError from '../../components/songs/LoadError'
import { formatTime } from '../../utils/format'

const TABS = ['Upload Song', 'Songs', 'Users', 'Rooms']
const SONGS_PAGE = { limit: 200 }
const AUDIO_ACCEPT = '.mp3,.wav,.ogg,.oga,.opus,.m4a,.aac,.flac,.webm'
const COVER_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif'
const CATEGORY_SUGGESTIONS = ['melody', 'love', 'motivation', 'sad']
const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition duration-200 hover:border-neutral-700 focus:border-emerald-500/70 focus:bg-neutral-950 focus:ring-4 focus:ring-emerald-500/15'
const labelClass = 'mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-neutral-300 uppercase'

const Icon = ({ children, className = 'h-5 w-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {children}
  </svg>
)
const MusicIcon = (p) => (
  <Icon {...p}>
    <path d="M9 18V5l12-2v13" />
    <circle cx="6" cy="18" r="3" />
    <circle cx="18" cy="16" r="3" />
  </Icon>
)
const ImageIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-5-5L5 21" />
  </Icon>
)
const UploadIcon = (p) => (
  <Icon {...p}>
    <path d="M12 16V4m0 0-4 4m4-4 4 4" />
    <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Icon>
)

function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function Field({ id, label, optional, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-normal tracking-normal text-neutral-400 normal-case">Optional</span>}
        {hint && <span className="ml-auto font-normal tracking-normal text-neutral-500 normal-case tabular-nums">{hint}</span>}
      </label>
      {children}
    </div>
  )
}

/** File picker styled as a drop zone; the real input covers it, so click, keyboard and drag-and-drop all work. */
function FileDrop({ name, accept, required, label, ariaLabel, types, file, onFile, icon, preview }) {
  const [dragging, setDragging] = useState(false)
  const state = dragging
    ? 'border-emerald-400 bg-emerald-500/10 ring-4 ring-emerald-500/10'
    : file
      ? 'border-emerald-500/40 bg-emerald-500/5'
      : 'border-neutral-700 bg-neutral-950/40 hover:border-neutral-500 hover:bg-neutral-900'
  return (
    <div>
      <div className={labelClass}>
        {label}
        {!required && <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-normal tracking-normal text-neutral-400 normal-case">Optional</span>}
      </div>
      <div className={`group relative flex items-center gap-4 rounded-xl border border-dashed p-4 transition duration-200 focus-within:border-emerald-500/70 focus-within:ring-4 focus-within:ring-emerald-500/15 ${state}`}>
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg transition duration-200 group-hover:scale-105 ${file ? 'bg-emerald-500/15 text-emerald-400' : 'bg-neutral-800 text-neutral-400'}`}
        >
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : icon}
        </div>
        <div className="min-w-0 flex-1">
          {file ? (
            <>
              <p className="truncate text-sm font-medium text-neutral-100">{file.name}</p>
              <p className="mt-0.5 text-xs text-neutral-400">{formatSize(file.size)} · Click to replace</p>
            </>
          ) : (
            <>
              <p className="text-sm text-neutral-300">
                <span className="font-semibold text-emerald-400">Choose a file</span> or drag it here
              </p>
              <p className="mt-0.5 text-xs text-neutral-500">{types}</p>
            </>
          )}
        </div>
        <input
          name={name}
          type="file"
          accept={accept}
          required={required}
          aria-label={ariaLabel}
          onChange={(e) => onFile(e.target.files[0] ?? null)}
          onDragEnter={() => setDragging(true)}
          onDragLeave={() => setDragging(false)}
          onDrop={() => setDragging(false)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </div>
  )
}

function UploadSongForm() {
  const [message, setMessage] = useState(null)
  const [busy, setBusy] = useState(false)
  const [audio, setAudio] = useState(null)
  const [cover, setCover] = useState(null)
  const [duration, setDuration] = useState('')
  const coverUrl = useMemo(() => (cover && URL.createObjectURL ? URL.createObjectURL(cover) : null), [cover])
  useEffect(() => () => coverUrl && URL.revokeObjectURL(coverUrl), [coverUrl])

  const onSubmit = async (e) => {
    e.preventDefault()
    const form = e.currentTarget
    setBusy(true)
    setMessage(null)
    try {
      const song = await uploadSong(new FormData(form))
      setMessage({ ok: true, text: `Uploaded “${song.title}”` })
      form.reset()
      setAudio(null)
      setCover(null)
      setDuration('')
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err).message })
    } finally {
      setBusy(false)
    }
  }

  const seconds = Number(duration)
  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-4xl overflow-hidden rounded-2xl border border-neutral-800 bg-linear-to-b from-neutral-900 to-neutral-950 shadow-2xl shadow-black/40 motion-safe:animate-rise"
    >
      <div className="flex items-center gap-4 border-b border-neutral-800/80 bg-linear-to-r from-emerald-500/10 via-transparent to-transparent px-5 py-5 sm:px-7">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/25">
          <UploadIcon />
        </div>
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Upload a song</h2>
          <p className="text-sm text-neutral-400">It becomes searchable and playable for everyone right away.</p>
        </div>
      </div>

      <div className="grid gap-8 px-5 py-6 sm:px-7 md:grid-cols-5">
        <section className="flex flex-col gap-5 md:col-span-3">
          <h3 className="text-sm font-semibold text-neutral-200">Song details</h3>
          <Field id="upload-title" label="Title">
            <input id="upload-title" name="title" aria-label="Title" required maxLength={200} placeholder="e.g. Evening Breeze" className={inputClass} />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="upload-artist" label="Artist">
              <input id="upload-artist" name="artist" aria-label="Artist" required maxLength={200} placeholder="e.g. Aria Nova" className={inputClass} />
            </Field>
            <Field id="upload-album" label="Album" optional>
              <input id="upload-album" name="album" aria-label="Album" maxLength={200} placeholder="e.g. Calm Skies" className={inputClass} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="upload-category" label="Category">
              <input
                id="upload-category"
                name="category"
                aria-label="Category"
                required
                maxLength={50}
                list="upload-categories"
                placeholder="melody, love, sad…"
                className={inputClass}
              />
              <datalist id="upload-categories">
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </Field>
            <Field id="upload-duration" label="Duration" hint={seconds > 0 ? formatTime(seconds) : null}>
              <div className="relative">
                <input
                  id="upload-duration"
                  name="duration_seconds"
                  aria-label="Duration in seconds"
                  type="number"
                  min={0}
                  required
                  placeholder="180"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-xs text-neutral-500">sec</span>
              </div>
            </Field>
          </div>
        </section>

        <section className="flex flex-col gap-5 md:col-span-2">
          <h3 className="text-sm font-semibold text-neutral-200">Media</h3>
          <FileDrop
            name="audio_file"
            accept={AUDIO_ACCEPT}
            required
            label="Audio file"
            ariaLabel="Audio file (MP3, WAV, OGG, M4A, AAC, FLAC, WebM; up to 50 MB)"
            types="MP3, WAV, OGG, M4A, AAC, FLAC, WebM · up to 50 MB"
            file={audio}
            onFile={setAudio}
            icon={<MusicIcon className="h-6 w-6" />}
          />
          <FileDrop
            name="cover_file"
            accept={COVER_ACCEPT}
            label="Cover image"
            ariaLabel="Cover image (optional; JPG, PNG, WebP, GIF; up to 5 MB)"
            types="JPG, PNG, WebP, GIF · up to 5 MB"
            file={cover}
            onFile={setCover}
            icon={<ImageIcon className="h-6 w-6" />}
            preview={coverUrl}
          />
        </section>
      </div>

      <div className="flex flex-col-reverse gap-4 border-t border-neutral-800/80 bg-neutral-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div className="min-h-5 text-sm" aria-live="polite">
          {message ? (
            <p
              role={message.ok ? 'status' : 'alert'}
              className={`flex items-start gap-2 motion-safe:animate-rise ${message.ok ? 'text-emerald-300' : 'text-red-400'}`}
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0">
                {message.ok ? <path d="m5 12 5 5L20 7" /> : <path d="M12 8v5m0 3.5v.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />}
              </Icon>
              <span>{message.text}</span>
            </p>
          ) : (
            <p className="text-neutral-500">Fields without “Optional” are required.</p>
          )}
        </div>
        <button
          disabled={busy}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-linear-to-r from-emerald-400 to-emerald-500 px-7 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/20 transition duration-200 hover:-translate-y-0.5 hover:from-emerald-300 hover:to-emerald-400 hover:shadow-emerald-500/35 focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none active:translate-y-0 disabled:pointer-events-none disabled:opacity-60"
        >
          {busy ? (
            <svg viewBox="0 0 24 24" className="h-4 w-4 motion-safe:animate-spin" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
              <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <UploadIcon className="h-4 w-4" />
          )}
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </form>
  )
}

const TrashIcon = (p) => (
  <Icon {...p}>
    <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
  </Icon>
)
const UsersIcon = (p) => (
  <Icon {...p}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
  </Icon>
)
const RoomsIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="2" />
    <path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2" />
  </Icon>
)
const ShieldIcon = (p) => (
  <Icon {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
)

const AVATAR_COLORS = [
  'from-emerald-400 to-teal-600',
  'from-sky-400 to-indigo-600',
  'from-fuchsia-400 to-purple-600',
  'from-amber-400 to-orange-600',
  'from-rose-400 to-pink-600',
]
const DATE = { day: 'numeric', month: 'short', year: 'numeric' }
const DATE_TIME = { ...DATE, hour: 'numeric', minute: '2-digit' }

function Avatar({ id, name, className = 'h-8 w-8 text-xs' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-linear-to-br font-semibold text-white shadow-sm shadow-black/40 ${AVATAR_COLORS[id % AVATAR_COLORS.length]} ${className}`}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  )
}

function Badge({ tone = 'neutral', children }) {
  const tones = {
    neutral: 'bg-neutral-800/80 text-neutral-300 ring-neutral-700',
    emerald: 'bg-emerald-500/10 text-emerald-300 ring-emerald-500/30',
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset ${tones[tone]}`}>
      {children}
    </span>
  )
}

/** Card shell shared by the admin lists. */
function Panel({ icon, title, subtitle, count, children }) {
  return (
    <section className="w-full overflow-hidden rounded-2xl border border-neutral-800 bg-linear-to-b from-neutral-900 to-neutral-950 shadow-2xl shadow-black/40 motion-safe:animate-rise">
      <header className="flex items-center gap-4 border-b border-neutral-800/80 bg-linear-to-r from-emerald-500/10 via-transparent to-transparent px-5 py-4 sm:px-6">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-linear-to-br from-emerald-400 to-emerald-600 text-neutral-950 shadow-lg shadow-emerald-500/25">
          {icon}
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight text-white">{title}</h2>
          <p className="text-sm text-neutral-400">{subtitle}</p>
        </div>
        {count != null && (
          <span className="ml-auto rounded-full border border-neutral-700 bg-neutral-800/80 px-2.5 py-0.5 text-xs font-medium text-neutral-300 tabular-nums">
            {count}
          </span>
        )}
      </header>
      {children}
    </section>
  )
}

/** Wide tables scroll sideways inside the card on small screens instead of stretching the page. */
function TableScroll({ children }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-3 [&_tr>*:first-child]:pl-6 [&_tr>*:last-child]:pr-6">
        {children}
      </table>
    </div>
  )
}

const theadClass = 'bg-neutral-950/50 text-[11px] font-medium tracking-wider text-neutral-500 uppercase'
const rowClass = 'border-t border-neutral-800/70 transition-colors duration-150 hover:bg-white/[0.03]'

/** Loading / error / empty handling shared by the admin lists. */
function QueryState({ query, empty, icon, children }) {
  if (query.loading)
    return (
      <div aria-busy="true" className="space-y-2.5 p-6">
        <span className="sr-only">Loading…</span>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 rounded-lg bg-neutral-800/50 motion-safe:animate-pulse" style={{ opacity: 1 - i * 0.2 }} />
        ))}
      </div>
    )
  if (query.error)
    return (
      <div className="p-6">
        <LoadError error={query.error} onRetry={query.reload} />
      </div>
    )
  if (!query.data.length)
    return (
      <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-800/80 text-neutral-500">{icon}</div>
        <p className="text-sm text-neutral-400">{empty}</p>
      </div>
    )
  return children
}

function Notice({ message }) {
  if (!message) return null
  return (
    <div className="px-5 pt-4 sm:px-6">
      <p
        role={message.ok ? 'status' : 'alert'}
        className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm motion-safe:animate-rise ${message.ok ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200' : 'border-red-500/30 bg-red-500/10 text-red-300'}`}
      >
        <Icon className="h-4 w-4 shrink-0">
          {message.ok ? <path d="m5 12 5 5L20 7" /> : <path d="M12 8v5m0 3.5v.01M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />}
        </Icon>
        {message.text}
      </p>
    </div>
  )
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
    <Panel
      icon={<MusicIcon />}
      title="Songs"
      subtitle="The whole catalog. Deleting removes a song from every library and room."
      count={songs.data?.length}
    >
      <Notice message={message} />
      <QueryState query={songs} empty="No songs yet." icon={<MusicIcon />}>
        <TableScroll>
          <thead className={theadClass}>
            <tr>
              <th className="w-16">ID</th>
              <th>Title</th>
              <th>Artist</th>
              <th>Category</th>
              <th>Length</th>
              <th>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {songs.data?.map((s) => (
              <tr
                key={s.id}
                data-testid={`admin-song-${s.id}`}
                className={`${rowClass} ${deleting === s.id ? 'opacity-50' : ''}`}
              >
                <td className="text-neutral-500 tabular-nums">{s.id}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <CoverImage src={s.cover_url} className="h-10 w-10 shrink-0 rounded-md shadow-md shadow-black/40 [&_span]:text-base" />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{s.title}</p>
                      {s.album && <p className="truncate text-xs text-neutral-500">{s.album}</p>}
                    </div>
                  </div>
                </td>
                <td className="text-neutral-300">{s.artist}</td>
                <td>
                  <div className="flex flex-wrap gap-1.5">
                    {s.category.split(',').map((c) => (
                      <Badge key={c} tone="emerald">
                        {c.trim()}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="text-neutral-400 tabular-nums">{formatTime(s.duration_seconds)}</td>
                <td className="text-right">
                  <button
                    onClick={() => onDelete(s)}
                    disabled={deleting !== null}
                    aria-label={`Delete ${s.title}`}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-400 ring-1 ring-transparent transition duration-150 ring-inset hover:bg-red-500/10 hover:text-red-400 hover:ring-red-500/30 focus-visible:ring-red-500/50 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                    {deleting === s.id ? 'Deleting…' : 'Delete'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      </QueryState>
    </Panel>
  )
}

function UsersTable() {
  const users = useApiQuery(listUsers)
  return (
    <Panel
      icon={<UsersIcon />}
      title="Users"
      subtitle="Everyone with an account. Admins can manage the catalog."
      count={users.data?.length}
    >
      <QueryState query={users} empty="No users yet." icon={<UsersIcon />}>
        <TableScroll>
          <thead className={theadClass}>
            <tr>
              <th className="w-16">ID</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((u) => (
              <tr key={u.id} data-testid={`admin-user-${u.id}`} className={rowClass}>
                <td className="text-neutral-500 tabular-nums">{u.id}</td>
                <td>
                  <div className="flex items-center gap-3">
                    <Avatar id={u.id} name={u.username} />
                    <span className="font-medium text-white">{u.username}</span>
                  </div>
                </td>
                <td className="text-neutral-400">{u.email}</td>
                <td>
                  {u.is_admin ? (
                    <Badge tone="emerald">
                      <ShieldIcon className="h-3 w-3" />
                      Admin
                    </Badge>
                  ) : (
                    <Badge>User</Badge>
                  )}
                </td>
                <td className="text-neutral-400 tabular-nums">{new Date(u.created_at).toLocaleDateString(undefined, DATE)}</td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      </QueryState>
    </Panel>
  )
}

function RoomsTable() {
  const rooms = useApiQuery(listRooms)
  return (
    <Panel
      icon={<RoomsIcon />}
      title="Active rooms"
      subtitle="Musical Rooms open right now, newest first."
      count={rooms.data?.length}
    >
      <QueryState query={rooms} empty="No active rooms right now." icon={<RoomsIcon />}>
        <TableScroll>
          <thead className={theadClass}>
            <tr>
              <th>Room ID</th>
              <th>Name</th>
              <th>Participants</th>
              <th>Playing</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {rooms.data?.map((r) => (
              <tr key={r.id} data-testid={`admin-room-${r.id}`} className={rowClass}>
                <td>
                  <span className="rounded-md bg-neutral-800/80 px-2 py-1 font-mono text-xs tracking-wider text-neutral-200 ring-1 ring-neutral-700 ring-inset">
                    {r.id}
                  </span>
                </td>
                <td className="font-medium text-white">{r.name}</td>
                <td>
                  <div className="flex items-center gap-2">
                    <div className="flex -space-x-2">
                      {r.participants.slice(0, 3).map((p) => (
                        <Avatar key={p.user.id} id={p.user.id} name={p.user.username} className="h-7 w-7 text-[11px] ring-2 ring-neutral-900" />
                      ))}
                    </div>
                    <span className="text-neutral-400 tabular-nums">{r.participants.length}</span>
                  </div>
                </td>
                <td>
                  {r.is_playing ? (
                    <Badge tone="emerald">
                      <span className="relative flex h-2 w-2">
                        <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 motion-safe:animate-ping" />
                        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                      </span>
                      Playing
                    </Badge>
                  ) : (
                    <Badge>Paused</Badge>
                  )}
                </td>
                <td className="text-neutral-400 tabular-nums">{new Date(r.created_at).toLocaleString(undefined, DATE_TIME)}</td>
              </tr>
            ))}
          </tbody>
        </TableScroll>
      </QueryState>
    </Panel>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState(TABS[0])

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Admin Panel</h1>
      <p className="mt-1 mb-6 text-sm text-neutral-400">Manage the catalog, users and live rooms.</p>
      <div role="tablist" className="mb-6 grid grid-cols-2 gap-1 rounded-2xl border border-neutral-800 bg-neutral-900/70 p-1 sm:inline-flex">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-1.5 text-sm font-medium transition duration-200 focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none ${tab === t ? 'bg-white text-neutral-950 shadow-md shadow-black/30' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}
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
