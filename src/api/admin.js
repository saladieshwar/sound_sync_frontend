import client from './client'

/** formData fields: title, artist, album?, category, duration_seconds, audio_file, cover_file? */
export const uploadSong = (formData) => client.post('/admin/songs', formData).then((r) => r.data)
export const deleteSong = (songId) => client.delete(`/admin/songs/${songId}`)
export const listUsers = () => client.get('/admin/users').then((r) => r.data)
export const listRooms = () => client.get('/admin/rooms').then((r) => r.data)
