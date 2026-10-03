import client from './client'

export const listSongs = (params) => client.get('/songs', { params }).then((r) => r.data)
export const getSong = (id) => client.get(`/songs/${id}`).then((r) => r.data)
export const searchSongs = (q) => client.get('/songs/search', { params: { q } }).then((r) => r.data)
export const listCategories = () => client.get('/songs/categories').then((r) => r.data)
export const songsByCategory = (name) =>
  client.get(`/songs/category/${encodeURIComponent(name)}`).then((r) => r.data)
export const listAlbums = () => client.get('/songs/albums').then((r) => r.data)
export const songsByAlbum = (name) =>
  client.get(`/songs/album/${encodeURIComponent(name)}`).then((r) => r.data)
