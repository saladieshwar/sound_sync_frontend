import { mediaUrl } from '../../config'

/** Horizontal row of cards used for categories and albums on the Home page. */
export default function SectionRow({ title, items, onSelect }) {
  if (!items.length) return null
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item)}
            className="w-40 shrink-0 rounded-lg bg-neutral-900 p-3 text-left hover:bg-neutral-800"
          >
            <div className="mb-2 aspect-square w-full overflow-hidden rounded bg-neutral-800">
              {item.cover && (
                <img src={mediaUrl(item.cover)} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <p className="truncate font-medium capitalize">{item.label}</p>
            {item.sublabel && <p className="truncate text-sm text-neutral-400">{item.sublabel}</p>}
          </button>
        ))}
      </div>
    </section>
  )
}
