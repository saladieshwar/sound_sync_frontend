const GRADIENTS = [
  'from-emerald-500 to-teal-800',
  'from-sky-500 to-indigo-800',
  'from-fuchsia-500 to-purple-800',
  'from-amber-400 to-orange-700',
  'from-rose-500 to-red-800',
  'from-violet-500 to-indigo-900',
  'from-teal-400 to-sky-900',
  'from-cyan-400 to-blue-800',
]

/** A stable gradient per label, so a category always gets the same colours. */
export function tileGradient(label = '') {
  let hash = 0
  for (const ch of label.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}
