import { useState } from 'react'
import { mediaUrl } from '../../config'

/** Cover art with a placeholder when there is no cover or it fails to load. */
export default function CoverImage({ src, label = '', className = '' }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const showImage = src && failedSrc !== src

  return (
    <div
      className={`flex items-center justify-center overflow-hidden bg-gradient-to-br from-emerald-700 to-neutral-800 ${className}`}
    >
      {showImage ? (
        <img
          src={mediaUrl(src)}
          alt={label}
          onError={() => setFailedSrc(src)}
          className="h-full w-full object-cover"
        />
      ) : (
        <span role="img" aria-label={label || 'No cover'} className="text-3xl text-white/60">
          ♪
        </span>
      )}
    </div>
  )
}
