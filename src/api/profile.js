import client from './client'

/** changes: any of username, full_name, phone, bio ('' clears full_name / phone / bio). Returns the updated user. */
export const updateProfile = (changes) => client.patch('/users/me', changes).then((r) => r.data)
export const uploadAvatar = (file) => {
  const form = new FormData()
  form.append('avatar_file', file)
  return client.put('/users/me/avatar', form).then((r) => r.data)
}
export const removeAvatar = () => client.delete('/users/me/avatar').then((r) => r.data)
