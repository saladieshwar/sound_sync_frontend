import client from './client'

export const getLikedSongs = () => client.get('/users/me/liked-songs').then((r) => r.data)
export const likeSong = (songId) =>
  client.post(`/users/me/liked-songs/${songId}`).then((r) => r.data)
export const unlikeSong = (songId) => client.delete(`/users/me/liked-songs/${songId}`)
export const getRecentlyPlayed = () => client.get('/users/me/recently-played').then((r) => r.data)
export const logPlay = (songId) =>
  client.post(`/users/me/recently-played/${songId}`).then((r) => r.data)
