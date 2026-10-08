import { useEffect, useRef, useState } from 'react'
import { ArrowRightIcon, ChevronIcon, MusicIcon } from '../ui/icons'
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
      className={`${cardClass} flex aspect-[4/3] flex-col justify-end overflow-hidden bg-linear-to-br p-4 shadow-lg ring-1 shadow-black/40 ring-white/10 ring-inset hover:-translate-y-1 hover:shadow-xl hover:shadow-black/60 ${tileGradient(item.label)}`}
    >
      <span aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent" />
      <MusicIcon className="absolute -right-3 -bottom-3 h-20 w-20 rotate-12 text-white/10 transition-transform duration-500 group-hover/card:rotate-0 group-hover/card:scale-110" />
      <span
        aria-hidden="true"
        className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-white/15 blur-2xl transition-opacity duration-500 group-hover/card:opacity-60"
      />
      <span className="relative line-clamp-2 text-base leading-snug font-semibold tracking-tight text-white capitalize drop-shadow-sm">
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
      className={`${cardClass} border border-white/5 bg-neutral-900/60 p-2.5 hover:-translate-y-1 hover:border-white/10 hover:bg-neutral-800/60 hover:shadow-xl hover:shadow-black/50 sm:p-3`}
    >
      <div className="relative mb-3 overflow-hidden rounded-xl shadow-lg shadow-black/50">
        <CoverImage
          src={item.cover}
          label={item.label}
          className="aspect-square w-full transition-transform duration-500 group-hover/card:scale-105"
        />
        <span aria-hidden="true" className="absolute inset-0 rounded-xl ring-1 ring-white/10 ring-inset" />
        <span
          aria-hidden="true"
          className="absolute right-2 bottom-2 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-emerald-500 text-neutral-950 opacity-0 shadow-lg shadow-black/50 transition duration-300 group-hover/card:translate-y-0 group-hover/card:opacity-100 group-focus-visible/card:translate-y-0 group-focus-visible/card:opacity-100"
        >
          <ArrowRightIcon className="h-4.5 w-4.5" />
        </span>
      </div>
      <p className="truncate font-semibold tracking-tight text-white capitalize">{item.label}</p>
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

const arrowClass =
  'flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-300 transition duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-90 disabled:pointer-events-none disabled:opacity-30'

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
  const scroller = useRef(null)
  const [edges, setEdges] = useState({ start: true, end: true })
  const ready = !loading && !error && items.length > 0

  useEffect(() => {
    const el = scroller.current
    if (!ready || !el || typeof ResizeObserver === 'undefined') return undefined
    const update = () =>
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      })
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [ready, items.length])

  const scrollBy = (direction) => {
    const el = scroller.current
    el?.scrollBy?.({ left: direction * el.clientWidth * 0.8, behavior: 'smooth' })
  }

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
      <div
        ref={scroller}
        className="-mx-1 flex snap-x gap-3 overflow-x-auto scroll-smooth px-1 pt-1 pb-3 sm:gap-4 md:[scrollbar-width:none] [&>*]:snap-start"
      >
        {items.map((item, i) => (
          <Card key={item.key} item={item} index={i} onSelect={onSelect} />
        ))}
      </div>
    )
  }

  return (
    <section className="mb-10 motion-safe:animate-rise" aria-label={title}>
      <div className="mb-4 flex items-center gap-2.5">
        <h2 className="text-xl font-bold tracking-tight text-white">{title}</h2>
        {ready && (
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs font-medium text-neutral-400 tabular-nums">
            {items.length}
          </span>
        )}
        {ready && !(edges.start && edges.end) && (
          <div className="ml-auto hidden gap-1.5 md:flex">
            <button
              aria-label={`Scroll ${title.toLowerCase()} left`}
              disabled={edges.start}
              onClick={() => scrollBy(-1)}
              className={arrowClass}
            >
              <ChevronIcon className="h-4 w-4 rotate-180" />
            </button>
            <button
              aria-label={`Scroll ${title.toLowerCase()} right`}
              disabled={edges.end}
              onClick={() => scrollBy(1)}
              className={arrowClass}
            >
              <ChevronIcon className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
      {body}
    </section>
  )
}
