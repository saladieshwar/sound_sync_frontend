import { useState } from 'react'
import { mediaUrl } from '../../config'
import { MusicIcon } from '../ui/icons'

/**
 * Cover art with a placeholder when there is no cover or it fails to load.
 * `decorative`: hide it from screen readers when a visible title already names the song.
 */
export default function CoverImage({ src, label = '', className = '', decorative = false }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-linear-to-br from-emerald-700 via-emerald-900 to-neutral-900 ${className}`}
    >
      {showImage ? (
        <img
          src={mediaUrl(src)}
          alt={decorative ? '' : label}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span
          role={decorative ? undefined : 'img'}
          aria-label={decorative ? undefined : label || 'No cover'}
          aria-hidden={decorative || undefined}
          className="flex h-full w-full items-center justify-center text-white/55"
        >
          <MusicIcon className="h-2/5 w-2/5" />
        </span>
      )}
    </div>
  )
}
