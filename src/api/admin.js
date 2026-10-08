import client from './client'

/** formData fields: title, artist, album?, music_director?, category, duration_seconds, audio_file, cover_file? */
export const uploadSong = (formData) => client.post('/admin/songs', formData).then((r) => r.data)
/** changes: any of title, artist, album, music_director, category, duration_seconds ('' clears album / music_director) */
export const updateSong = (songId, changes) =>
  client.patch(`/admin/songs/${songId}`, changes).then((r) => r.data)
export const setSongCover = (songId, file) => {
  const form = new FormData()
  form.append('cover_file', file)
  return client.put(`/admin/songs/${songId}/cover`, form).then((r) => r.data)
}
export const removeSongCover = (songId) => client.delete(`/admin/songs/${songId}/cover`).then((r) => r.data)
export const deleteSong = (songId) => client.delete(`/admin/songs/${songId}`)
export const listUsers = () => client.get('/admin/users').then((r) => r.data)
export const listRooms = () => client.get('/admin/rooms').then((r) => r.data)
