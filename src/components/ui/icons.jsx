import useLikePop from './useLikePop'

function Icon({ className = 'h-5 w-5', children, fill = 'none', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke={fill === 'none' ? 'currentColor' : 'none'}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...props}
    >
      {children}
    </svg>
  )
}

export const PlayIcon = (props) => (
  <Icon fill="currentColor" {...props}>
    <path d="M8 5.14v13.72a1 1 0 0 0 1.52.85l10.98-6.86a1 1 0 0 0 0-1.7L9.52 4.29A1 1 0 0 0 8 5.14Z" />
  </Icon>
)

export const PauseIcon = (props) => (
  <Icon fill="currentColor" {...props}>
    <rect x="6" y="4.5" width="4" height="15" rx="1.2" />
    <rect x="14" y="4.5" width="4" height="15" rx="1.2" />
  </Icon>
)

export const PrevIcon = (props) => (
  <Icon fill="currentColor" {...props}>
    <rect x="4" y="5" width="2.5" height="14" rx="1" />
    <path d="M19.5 6.06v11.88a1 1 0 0 1-1.54.84L9.6 13.34a1.6 1.6 0 0 1 0-2.68l8.36-5.44a1 1 0 0 1 1.54.84Z" />
  </Icon>
)

export const NextIcon = (props) => (
  <Icon fill="currentColor" {...props}>
    <rect x="17.5" y="5" width="2.5" height="14" rx="1" />
    <path d="M4.5 6.06v11.88a1 1 0 0 0 1.54.84l8.36-5.44a1.6 1.6 0 0 0 0-2.68L6.04 5.22a1 1 0 0 0-1.54.84Z" />
  </Icon>
)

export const HeartIcon = ({ filled = false, ...props }) => (
  <Icon fill={filled ? 'currentColor' : 'none'} {...props}>
    <path
      stroke={filled ? 'none' : 'currentColor'}
      d="M12 20.25s-7.5-4.6-7.5-10.1A4.15 4.15 0 0 1 8.65 6c1.4 0 2.6.7 3.35 1.8A4.04 4.04 0 0 1 15.35 6a4.15 4.15 0 0 1 4.15 4.15c0 5.5-7.5 10.1-7.5 10.1Z"
    />
  </Icon>
)

const SPARK_ANGLES = [0, 60, 120, 180, 240, 300]

/** Heart that pops, rings and throws sparks when the song becomes liked. */
export function LikeHeart({ liked, songId = null, className = 'h-5 w-5' }) {
  const pops = useLikePop(liked, songId)
  const celebrate = liked && pops > 0
  return (
    <span className="relative inline-flex items-center justify-center">
      <HeartIcon
        key={pops}
        filled={liked}
        className={`${className} ${celebrate ? 'motion-safe:animate-like-pop' : ''}`}
      />
      {celebrate && (
        <span key={`burst-${pops}`} aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
          <span className="absolute -inset-1.5 rounded-full border-2 border-emerald-400 opacity-0 animate-like-ring" />
          {SPARK_ANGLES.map((angle, i) => (
            <span
              key={angle}
              style={{ '--angle': `${angle}deg` }}
              className={`absolute top-1/2 left-1/2 -mt-[2px] -ml-[2px] h-1 w-1 rounded-full opacity-0 animate-like-spark ${
                i % 2 ? 'bg-teal-300' : 'bg-emerald-400'
              }`}
            />
          ))}
        </span>
      )}
    </span>
  )
}

export const VolumeIcon = ({ muted = false, ...props }) => (
  <Icon {...props}>
    <path d="M11 5 6.5 9H3.5v6h3l4.5 4V5Z" fill="currentColor" stroke="none" />
    {muted ? (
      <path d="m16 9.5 5 5m0-5-5 5" />
    ) : (
      <path d="M15.5 8.8a4.5 4.5 0 0 1 0 6.4M18.4 6a8.5 8.5 0 0 1 0 12" />
    )}
  </Icon>
)

export const SearchIcon = (props) => (
  <Icon {...props}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.2-4.2" />
  </Icon>
)

export const LogoutIcon = (props) => (
  <Icon {...props}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 16l-4-4 4-4M6 12h10" />
  </Icon>
)

export const CheckIcon = (props) => (
  <Icon strokeWidth="3" {...props}>
    <path d="m5 12 5 5 9-10" />
  </Icon>
)

export const ChevronIcon = (props) => (
  <Icon strokeWidth="2.5" {...props}>
    <path d="m9 6 6 6-6 6" />
  </Icon>
)

export const ArrowRightIcon = (props) => (
  <Icon {...props}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
)

export const MusicIcon = (props) => (
  <Icon {...props}>
    <path d="M9 18V5.5l11-2V16" />
    <circle cx="6.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="16" r="2.5" />
  </Icon>
)

/** Small equalizer bars; they only move while `playing` and motion is allowed. */
export function EqBars({ playing = false, className = 'h-3.5' }) {
  return (
    <span aria-hidden="true" className={`flex items-end gap-0.5 ${className}`}>
      {[0.6, 1, 0.45].map((h, i) => (
        <span
          key={i}
          style={{ height: `${h * 100}%`, animationDelay: `${i * 0.18}s` }}
          className={`w-0.75 origin-bottom rounded-full bg-emerald-400 ${playing ? 'motion-safe:animate-eq' : ''}`}
        />
      ))}
    </span>
  )
}
