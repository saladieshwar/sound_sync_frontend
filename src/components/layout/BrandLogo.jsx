const MARK = '/brand/music-partner-mark.png'
const WORDMARK = '/brand/music-partner-wordmark.png'

const blend = 'object-contain object-center select-none'

/**
 * MusicPartner lockups.
 * nav: round badge in the header. Stays square and shrinks on phones and short landscape screens.
 * mark: larger round badge for the login panel.
 * auth: fluid wordmark above the login form.
 */
export default function BrandLogo({ variant = 'nav' }) {
  if (variant === 'mark') {
    return (
      <img
        src={MARK}
        alt="MusicPartner"
        width={1024}
        height={1024}
        draggable={false}
        className={`aspect-square h-auto w-full max-w-56 sm:max-w-64 ${blend}`}
      />
    )
  }

  if (variant === 'auth') {
    return (
      <img
        src={WORDMARK}
        alt="MusicPartner"
        width={1024}
        height={409}
        draggable={false}
        className={`h-auto w-full max-w-[16rem] sm:max-w-xs ${blend}`}
      />
    )
  }

  return (
    <img
      src={MARK}
      alt="MusicPartner"
      width={1024}
      height={1024}
      draggable={false}
      className={`aspect-square h-11 w-11 shrink-0 short:h-9 short:w-9 sm:h-12 sm:w-12 md:h-14 md:w-14 ${blend}`}
    />
  )
}
