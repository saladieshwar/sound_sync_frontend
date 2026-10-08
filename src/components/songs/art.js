const GRADIENTS = [
  'from-emerald-500 via-emerald-700 to-emerald-950',
  'from-sky-500 via-sky-800 to-slate-950',
  'from-violet-500 via-violet-800 to-indigo-950',
  'from-amber-500 via-orange-700 to-stone-950',
  'from-rose-500 via-rose-800 to-stone-950',
  'from-indigo-500 via-indigo-800 to-slate-950',
  'from-teal-400 via-teal-700 to-cyan-950',
  'from-fuchsia-500 via-purple-800 to-zinc-950',
]

/** A stable gradient per label, so a category always gets the same colours. */
export function tileGradient(label = '') {
  let hash = 0
  for (const ch of label.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}
