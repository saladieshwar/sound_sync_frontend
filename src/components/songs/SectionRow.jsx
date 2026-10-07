import CoverImage from './CoverImage'
import LoadError from './LoadError'

/** Horizontal row of cards used for categories and albums on the Home page. */
export default function SectionRow({ title, items, onSelect, loading = false, error = null, onRetry }) {
  let body
  if (loading) {
    body = <p className="text-sm text-neutral-500">Loading {title.toLowerCase()}…</p>
  } else if (error) {
    body = <LoadError error={error} onRetry={onRetry} />
  } else if (!items.length) {
    return null
  } else {
    body = (
      <div className="flex snap-x gap-3 overflow-x-auto pb-2 sm:gap-4 [&>*]:snap-start">
        {items.map((item) => (
          <button
            key={item.key}
            data-testid={`section-item-${item.key}`}
            onClick={() => onSelect(item)}
            className="w-32 shrink-0 rounded-lg bg-neutral-900 p-2 text-left hover:bg-neutral-800 sm:w-40 sm:p-3"
          >
            <CoverImage src={item.cover} label={item.label} className="mb-2 aspect-square w-full rounded" />
            <p className="truncate font-medium capitalize">{item.label}</p>
            {item.sublabel && <p className="truncate text-sm text-neutral-400">{item.sublabel}</p>}
          </button>
        ))}
      </div>
    )
  }

  return (
    <section className="mb-8" aria-label={title}>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {body}
    </section>
  )
}