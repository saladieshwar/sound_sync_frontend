import { useState } from 'react'
import { mediaUrl } from '../../config'

/** The user's profile picture, or their initial when there is none (or it fails to load). Decorative. */
export default function UserAvatar({ user, className = 'h-7 w-7 text-xs' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const src = user?.avatar_url
  const name = user?.full_name || user?.username || '?'
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-linear-to-br from-neutral-600 to-neutral-800 font-semibold text-white uppercase ring-1 ring-white/10 ${className}`}
    >
      {src && failedSrc !== src ? (
        <img
          src={mediaUrl(src)}
          alt=""
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        name.charAt(0)
      )}
    </span>
  )
}
