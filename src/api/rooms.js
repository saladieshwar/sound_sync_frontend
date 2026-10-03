import client from './client'

export const createRoom = (name) => client.post('/rooms', { name }).then((r) => r.data)
export const getRoom = (roomId) => client.get(`/rooms/${roomId}`).then((r) => r.data)
export const joinRoom = (roomId) => client.post(`/rooms/${roomId}/join`).then((r) => r.data)
export const leaveRoom = (roomId) => client.post(`/rooms/${roomId}/leave`).then((r) => r.data)
export const transferAccess = (roomId, targetUserId) =>
  client
    .post(`/rooms/${roomId}/transfer-access`, { target_user_id: targetUserId })
    .then((r) => r.data)
