import { useState } from 'react'
import { getApiError } from '../api/client'
import { removeAvatar, updateProfile, uploadAvatar } from '../api/profile'
import UserAvatar from '../components/ui/UserAvatar'
import { useAuth } from '../context/AuthContext'

const FIELDS = ['username', 'full_name', 'phone', 'bio']
const BIO_MAX = 300
const PHOTO_ACCEPT = '.jpg,.jpeg,.png,.webp,.gif'
const PHONE_CHARS = /^\+?[0-9 ()-]+$/

const inputClass =
  'w-full rounded-lg border border-neutral-800 bg-neutral-950/60 px-3.5 py-2.5 text-sm text-neutral-100 placeholder:text-neutral-500 outline-none transition duration-200 hover:border-neutral-700 focus:border-emerald-500/70 focus:bg-neutral-950 focus:ring-4 focus:ring-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-60'
const labelClass =
  'mb-1.5 flex items-center gap-2 text-xs font-medium tracking-wide text-neutral-300 uppercase'
const cardClass =
  'rounded-2xl border border-neutral-800 bg-linear-to-b from-neutral-900 to-neutral-950 shadow-2xl shadow-black/40 motion-safe:animate-rise'

const formValues = (user) => Object.fromEntries(FIELDS.map((f) => [f, user?.[f] ?? '']))

/** Same rule as the server, so a typo is caught before saving. */
function phoneProblem(phone) {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '').length
  if (!PHONE_CHARS.test(phone) || digits < 7 || digits > 15)
    return 'Phone must have 7–15 digits and only use + ( ) - and spaces'
  return null
}

function Field({ id, label, optional, hint, children }) {
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
        {optional && (
          <span className="rounded-full bg-neutral-800 px-2 py-0.5 text-[10px] font-normal tracking-normal text-neutral-400 normal-case">
            Optional
          </span>
        )}
        {hint && (
          <span className="ml-auto font-normal tracking-normal text-neutral-500 normal-case tabular-nums">
            {hint}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function Message({ message }) {
  if (!message) return null
  return (
    <p
      role={message.ok ? 'status' : 'alert'}
      className={`rounded-lg border px-3 py-2 text-sm motion-safe:animate-rise ${
        message.ok
          ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
          : 'border-red-500/30 bg-red-500/10 text-red-300'
      }`}
    >
      {message.text}
    </p>
  )
}

function PhotoCard({ user, onUser }) {
  const [busy, setBusy] = useState(null)
  const [message, setMessage] = useState(null)

  const run = async (kind, action, done) => {
    setBusy(kind)
    setMessage(null)
    try {
      onUser(await action())
      setMessage({ ok: true, text: done })
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err).message })
    } finally {
      setBusy(null)
    }
  }

  const onFile = (e) => {
    const file = e.target.files[0]
    e.target.value = ''
    if (file) run('upload', () => uploadAvatar(file), 'Profile photo updated')
  }

  const joined = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <section aria-label="Profile photo" className={`${cardClass} relative overflow-hidden`}>
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-28 bg-linear-to-br from-emerald-500/25 via-emerald-700/10 to-transparent"
      />
      <div className="relative flex flex-col items-center gap-4 px-6 pt-10 pb-6 text-center">
        <div className="relative">
          <UserAvatar
            user={user}
            className={`h-28 w-28 text-4xl shadow-2xl shadow-black/50 ring-4 ring-neutral-900 transition-opacity ${busy ? 'opacity-50' : ''}`}
          />
          {busy && (
            <span
              aria-hidden="true"
              className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-400 motion-safe:animate-spin"
            />
          )}
        </div>
        <div className="min-w-0 max-w-full">
          <h2 className="truncate text-xl font-bold tracking-tight text-white">
            {user.full_name || user.username}
          </h2>
          <p className="truncate text-sm text-neutral-400">@{user.username}</p>
          {user.is_admin && (
            <span className="mt-2 inline-flex rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300 ring-1 ring-emerald-500/30 ring-inset">
              Admin
            </span>
          )}
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <label
            className={`relative inline-flex cursor-pointer items-center rounded-xl bg-white px-4 py-2 text-sm font-semibold text-neutral-950 shadow-lg shadow-black/30 transition duration-200 focus-within:ring-4 focus-within:ring-emerald-500/30 hover:bg-emerald-50 active:scale-95 ${busy ? 'pointer-events-none opacity-60' : ''}`}
          >
            {busy === 'upload' ? 'Uploading…' : user.avatar_url ? 'Change photo' : 'Upload photo'}
            <input
              type="file"
              accept={PHOTO_ACCEPT}
              aria-label="Profile photo (JPG, PNG, WebP, GIF; up to 5 MB)"
              disabled={Boolean(busy)}
              onChange={onFile}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            />
          </label>
          {user.avatar_url && (
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => run('remove', removeAvatar, 'Profile photo removed')}
              className="rounded-xl px-4 py-2 text-sm font-medium text-neutral-300 ring-1 ring-neutral-700 transition duration-200 ring-inset hover:bg-red-500/10 hover:text-red-300 hover:ring-red-500/30 active:scale-95 disabled:opacity-50"
            >
              {busy === 'remove' ? 'Removing…' : 'Remove'}
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-500">JPG, PNG, WebP or GIF · up to 5 MB</p>
        <div className="w-full" aria-live="polite">
          <Message message={message} />
        </div>
      </div>
      <dl className="relative grid grid-cols-2 border-t border-neutral-800/80 text-left text-sm">
        <div className="min-w-0 px-5 py-4">
          <dt className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase">Email</dt>
          <dd className="mt-0.5 truncate text-neutral-200" title={user.email}>
            {user.email}
          </dd>
        </div>
        <div className="min-w-0 border-l border-neutral-800/80 px-5 py-4">
          <dt className="text-[11px] font-medium tracking-wider text-neutral-500 uppercase">Member since</dt>
          <dd className="mt-0.5 truncate text-neutral-200">{joined ?? '—'}</dd>
        </div>
      </dl>
    </section>
  )
}

function DetailsForm({ user, onUser }) {
  const [values, setValues] = useState(() => formValues(user))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState(null)
  const saved = formValues(user)
  const changes = Object.fromEntries(
    FIELDS.filter((f) => values[f].trim() !== saved[f].trim()).map((f) => [f, values[f].trim()]),
  )
  const dirty = Object.keys(changes).length > 0
  const set = (field) => (e) => setValues((v) => ({ ...v, [field]: e.target.value }))

  const onSubmit = async (e) => {
    e.preventDefault()
    const problem =
      values.username.trim().length < 2
        ? 'Username must be at least 2 characters'
        : phoneProblem(values.phone.trim())
    if (problem) {
      setMessage({ ok: false, text: problem })
      return
    }
    setBusy(true)
    setMessage(null)
    try {
      const updated = await updateProfile(changes)
      onUser(updated)
      setValues(formValues(updated))
      setMessage({ ok: true, text: 'Profile saved' })
    } catch (err) {
      setMessage({ ok: false, text: getApiError(err).message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label="Profile details"
      className={`${cardClass} flex flex-col overflow-hidden`}
      noValidate
    >
      <div className="border-b border-neutral-800/80 bg-linear-to-r from-emerald-500/10 via-transparent to-transparent px-5 py-4 sm:px-6">
        <h2 className="text-base font-semibold tracking-tight text-white">Personal details</h2>
        <p className="text-sm text-neutral-400">This is how you appear in SoundSync and in Musical Rooms.</p>
      </div>
      <div className="grid gap-5 px-5 py-6 sm:grid-cols-2 sm:px-6">
        <Field id="profile-username" label="Username">
          <input
            id="profile-username"
            aria-label="Username"
            required
            minLength={2}
            maxLength={50}
            autoComplete="username"
            value={values.username}
            onChange={set('username')}
            className={inputClass}
          />
        </Field>
        <Field id="profile-full-name" label="Full name" optional>
          <input
            id="profile-full-name"
            data-testid="profile-full-name"
            aria-label="Full name"
            maxLength={100}
            autoComplete="name"
            placeholder="e.g. Riya Sharma"
            value={values.full_name}
            onChange={set('full_name')}
            className={inputClass}
          />
        </Field>
        <Field id="profile-phone" label="Phone number" optional>
          <input
            id="profile-phone"
            data-testid="profile-phone"
            aria-label="Phone number"
            type="tel"
            inputMode="tel"
            maxLength={20}
            autoComplete="tel"
            placeholder="e.g. +91 98765 43210"
            value={values.phone}
            onChange={set('phone')}
            className={inputClass}
          />
        </Field>
        <Field id="profile-email" label="Email">
          <input
            id="profile-email"
            aria-label="Email"
            aria-describedby="profile-email-note"
            type="email"
            value={user.email}
            disabled
            className={inputClass}
          />
          <p id="profile-email-note" className="mt-1.5 text-xs text-neutral-500">
            Your login email can't be changed here.
          </p>
        </Field>
        <div className="sm:col-span-2">
          <Field id="profile-bio" label="Bio" optional hint={`${values.bio.length}/${BIO_MAX}`}>
            <textarea
              id="profile-bio"
              aria-label="Bio"
              rows={4}
              maxLength={BIO_MAX}
              placeholder="A few words about you and the music you love"
              value={values.bio}
              onChange={set('bio')}
              className={`${inputClass} resize-y`}
            />
          </Field>
        </div>
      </div>
      <div className="mt-auto flex flex-col-reverse gap-3 border-t border-neutral-800/80 bg-neutral-950/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="min-h-5 flex-1 text-sm" aria-live="polite">
          {message ? (
            <Message message={message} />
          ) : (
            <p className="text-neutral-500">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!dirty || busy}
            onClick={() => {
              setValues(saved)
              setMessage(null)
            }}
            className="flex-1 rounded-xl px-5 py-2.5 text-sm font-medium text-neutral-300 transition duration-150 hover:bg-white/5 hover:text-white disabled:pointer-events-none disabled:opacity-40 sm:flex-none"
          >
            Reset
          </button>
          <button
            type="submit"
            data-testid="profile-save"
            disabled={!dirty || busy}
            className="flex-1 rounded-xl bg-linear-to-r from-emerald-400 to-emerald-500 px-6 py-2.5 text-sm font-semibold text-neutral-950 shadow-lg shadow-emerald-500/20 transition duration-200 hover:from-emerald-300 hover:to-emerald-400 focus-visible:ring-4 focus-visible:ring-emerald-500/30 focus-visible:outline-none active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 sm:flex-none"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </form>
  )
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth()
  if (!user) return null
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 motion-safe:animate-rise">
        <p className="text-xs font-semibold tracking-[0.2em] text-emerald-300/90 uppercase">Account</p>
        <h1 className="mt-0.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">Your profile</h1>
        <p className="mt-1 text-sm text-neutral-400">Add a photo and the details you want to share.</p>
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-[20rem_minmax(0,1fr)]">
        <PhotoCard user={user} onUser={updateUser} />
        <DetailsForm user={user} onUser={updateUser} />
      </div>
    </div>
  )
}
