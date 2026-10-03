/** Songs from `{ song }` entries (e.g. play history), keeping the first occurrence of each. */
export function uniqueSongs(entries) {
  const seen = new Set()
  const songs = []
  for (const { song } of entries) {
    if (!seen.has(song.id)) {
      seen.add(song.id)
      songs.push(song)
    }
  }
  return songs
}
