import { ArrowRightIcon } from '../ui/icons'
import { tileGradient } from './art'
import CoverImage from './CoverImage'
import LoadError from './LoadError'

const cardClass =
  'group/card relative w-36 shrink-0 rounded-2xl text-left outline-none transition duration-300 focus-visible:ring-2 focus-visible:ring-emerald-500/70 active:translate-y-0 active:scale-[0.97] active:duration-100 motion-safe:animate-enter sm:w-44'

const stagger = (index) => ({ animationDelay: `${Math.min(index, 10) * 40}ms` })

function CategoryCard({ item, index, onSelect }) {
  return (
    <button
      data-testid={`section-item-${item.key}`}
      onClick={() => onSelect(item)}
      style={stagger(index)}
      className={`${cardClass} flex aspect-[4/3] flex-col justify-end overflow-hidden bg-linear-to-br p-4 shadow-lg shadow-black/40 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 ${tileGradient(item.label)}`}
    >
      <span
        aria-hidden="true"
        className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-white/15 blur-xl transition-transform duration-500 group-hover/card:scale-150"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-black/45 to-transparent" />
      <span className="relative line-clamp-2 text-base font-bold leading-snug text-white capitalize drop-shadow">
        {item.label}
      </span>
    </button>
  )
}

function AlbumCard({ item, index, onSelect }) {
  return (
    <button
      data-testid={`section-item-${item.key}`}
      onClick={() => onSelect(item)}
      style={stagger(index)}
      className={`${cardClass} border border-white/5 bg-neutral-900/70 p-2.5 hover:-translate-y-1 hover:border-white/10 hover:bg-neutral-800/70 hover:shadow-xl hover:shadow-black/50 sm:p-3`}
    >
      <div className="relative mb-3">
        <CoverImage
          src={item.cover}
          label={item.label}
          className="aspect-square w-full rounded-xl shadow-lg shadow-black/50 transition-transform duration-500 group-hover/card:scale-[1.03]"
        />
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-2 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 opacity-0 shadow-lg shadow-black/50 transition duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100"
        >
          <ArrowRightIcon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="truncate font-semibold text-white capitalize">{item.label}</p>
      {item.sublabel && <p className="mt-0.5 truncate text-sm text-neutral-400">{item.sublabel}</p>}
    </button>
  )
}

function SkeletonCards({ title, variant }) {
  return (
    <div className="flex gap-3 overflow-hidden pb-2 sm:gap-4">
      <span className="sr-only">Loading {title.toLowerCase()}…</span>
      {Array.from({ length: 6 }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className={`w-36 shrink-0 shimmer rounded-2xl sm:w-44 ${variant === 'category' ? 'aspect-[4/3]' : 'aspect-[3/4]'}`}
        />
      ))}
    </div>
  )
}

/**
 * Horizontal row of cards used for categories and albums on the Home page.
 * variant: 'category' (colour tiles) | 'album' (cover art cards)
 */
export default function SectionRow({
  title,
  items,
  onSelect,
  loading = false,
  error = null,
  onRetry,
  variant = 'album',
}) {
  let body
  if (loading) {
    body = <SkeletonCards title={title} variant={variant} />
  } else if (error) {
    body = <LoadError error={error} onRetry={onRetry} />
  } else if (!items.length) {
    return null
  } else {
    const Card = variant === 'category' ? CategoryCard : AlbumCard
    body = (
      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pt-1 pb-3 sm:gap-4 [&>*]:snap-start">
        {items.map((item, i) => (
          <Card key={item.key} item={item} index={i} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  return (
    <section className="mb-10 motion-safe:animate-rise" aria-label={title}>
      <h2 className="mb-4 text-xl font-bold tracking-tight text-white">{title}</h2>
      {body}
    </section>
  )
}
