const NAMED = {
  love: 'from-fuchsia-500 via-purple-600 to-violet-950',
  melody: 'from-violet-500 via-purple-700 to-indigo-950',
  motivation: 'from-fuchsia-600 via-purple-600 to-violet-950',
  sad: 'from-indigo-400 via-blue-700 to-slate-950',
}

const GRADIENTS = [
  'from-violet-500 via-purple-700 to-indigo-950',
  'from-fuchsia-500 via-purple-700 to-violet-950',
  'from-purple-500 via-violet-800 to-indigo-950',
  'from-indigo-400 via-violet-700 to-slate-950',
  'from-fuchsia-400 via-purple-800 to-zinc-950',
  'from-violet-400 via-fuchsia-800 to-purple-950',
]

/** A stable gradient per label, so a category always gets the same colours. */
export function tileGradient(label = '') {
  const named = NAMED[label.toLowerCase()]
  if (named) return named
  let hash = 0
  for (const ch of label.toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)) >>> 0
  return GRADIENTS[hash % GRADIENTS.length]
}
