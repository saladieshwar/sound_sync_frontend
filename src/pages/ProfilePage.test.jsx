import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as authApi from '../api/auth'
import { TOKEN_KEY } from '../api/client'
import * as profileApi from '../api/profile'
import Navbar from '../components/layout/Navbar'
import { AuthProvider } from '../context/AuthContext'
import { apiError } from '../testUtils'
import ProfilePage from './ProfilePage'

vi.mock('../api/auth')
vi.mock('../api/profile')
const RIYA = {
  id: 2,
  username: 'riya',
  email: 'riya@soundsync.dev',
  is_admin: false,
  full_name: null,
  phone: null,
  bio: null,
  avatar_url: null,
  created_at: '2026-10-04T00:00:00Z',
}

async function renderPage(user = RIYA) {
  authApi.getMe.mockResolvedValue(user)
  render(
    <MemoryRouter initialEntries={['/profile']}>
      <AuthProvider>
        <Navbar />
        <ProfilePage />
      </AuthProvider>
    </MemoryRouter>,
  )
  return screen.findByRole('form', { name: 'Profile details' })
}

const save = () => userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

beforeEach(() => {
  localStorage.setItem(TOKEN_KEY, 'token')
})

afterEach(() => localStorage.clear())

describe('ProfilePage — details', () => {
  it('shows the current details; email is read-only and Save waits for a change', async () => {
    const form = await renderPage({
      ...RIYA,
      full_name: 'Riya Sharma',
      phone: '+91 98765 43210',
      bio: 'Melody fan',
    })
    expect(within(form).getByLabelText('Username')).toHaveValue('riya')
    expect(within(form).getByLabelText('Full name')).toHaveValue('Riya Sharma')
    expect(within(form).getByLabelText('Phone number')).toHaveValue('+91 98765 43210')
    expect(within(form).getByLabelText('Bio')).toHaveValue('Melody fan')
    expect(within(form).getByLabelText('Email')).toHaveValue('riya@soundsync.dev')
    expect(within(form).getByLabelText('Email')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('heading', { name: 'Riya Sharma' })).toBeInTheDocument()
  })

  it('saves only the changed fields, trimmed, and updates the top bar', async () => {
    const updated = { ...RIYA, username: 'riya_s', full_name: 'Riya Sharma', phone: '9876543210' }
    profileApi.updateProfile.mockResolvedValue(updated)
    const form = await renderPage()
    await userEvent.clear(within(form).getByLabelText('Username'))
    await userEvent.type(within(form).getByLabelText('Username'), 'riya_s')
    await userEvent.type(within(form).getByLabelText('Full name'), '  Riya Sharma ')
    await userEvent.type(within(form).getByLabelText('Phone number'), '9876543210')
    expect(screen.getByText('You have unsaved changes.')).toBeInTheDocument()
    await save()

    expect(profileApi.updateProfile).toHaveBeenCalledWith({
      username: 'riya_s',
      full_name: 'Riya Sharma',
      phone: '9876543210',
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Profile saved')
    expect(within(form).getByLabelText('Full name')).toHaveValue('Riya Sharma')
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled()
    expect(screen.getByRole('link', { name: 'Profile: riya_s' })).toHaveAttribute('href', '/profile')
  })

  it('clears an optional field by sending it empty', async () => {
    profileApi.updateProfile.mockResolvedValue({ ...RIYA, bio: null })
    const form = await renderPage({ ...RIYA, bio: 'Old bio' })
    await userEvent.clear(within(form).getByLabelText('Bio'))
    await save()
    expect(profileApi.updateProfile).toHaveBeenCalledWith({ bio: '' })
  })

  it('counts bio characters', async () => {
    const form = await renderPage()
    await userEvent.type(within(form).getByLabelText('Bio'), 'Hello')
    expect(within(form).getByText('5/300')).toBeInTheDocument()
    expect(within(form).getByLabelText('Bio')).toHaveAttribute('maxLength', '300')
  })

  it.each([['12345'], ['call me'], ['+1 234 567 890 123 456']])(
    'rejects the phone number %s before sending',
    async (phone) => {
      const form = await renderPage()
      await userEvent.type(within(form).getByLabelText('Phone number'), phone)
      await save()
      expect(screen.getByRole('alert')).toHaveTextContent('Phone must have 7–15 digits')
      expect(profileApi.updateProfile).not.toHaveBeenCalled()
    },
  )

  it('rejects a username shorter than 2 characters before sending', async () => {
    const form = await renderPage()
    await userEvent.clear(within(form).getByLabelText('Username'))
    await userEvent.type(within(form).getByLabelText('Username'), 'r')
    await save()
    expect(screen.getByRole('alert')).toHaveTextContent('Username must be at least 2 characters')
    expect(profileApi.updateProfile).not.toHaveBeenCalled()
  })

  it('shows the server reason and keeps the edits', async () => {
    profileApi.updateProfile.mockRejectedValue(apiError(422, 'VALIDATION_ERROR', 'full_name: too long'))
    const form = await renderPage()
    await userEvent.type(within(form).getByLabelText('Full name'), 'Riya')
    await save()
    expect(await screen.findByRole('alert')).toHaveTextContent('full_name: too long')
    expect(within(form).getByLabelText('Full name')).toHaveValue('Riya')
  })

  it('Reset undoes unsaved edits', async () => {
    const form = await renderPage()
    await userEvent.type(within(form).getByLabelText('Full name'), 'Riya')
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }))
    expect(within(form).getByLabelText('Full name')).toHaveValue('')
    expect(screen.getByText('All changes saved.')).toBeInTheDocument()
  })
})

describe('ProfilePage — photo', () => {
  it('uploads a new photo straight away and shows it in the top bar too', async () => {
    profileApi.uploadAvatar.mockResolvedValue({ ...RIYA, avatar_url: '/media/avatars/abc.png' })
    await renderPage()
    const file = new File(['png'], 'me.png', { type: 'image/png' })
    await userEvent.upload(screen.getByLabelText(/Profile photo \(JPG/), file)

    expect(profileApi.uploadAvatar).toHaveBeenCalledWith(file)
    expect(await screen.findByText('Profile photo updated')).toBeInTheDocument()
    const photos = document.querySelectorAll('img[src$="/media/avatars/abc.png"]')
    expect(photos).toHaveLength(2) // profile card and top bar
    expect(screen.getByRole('button', { name: 'Remove' })).toBeInTheDocument()
  })

  it('removes the photo', async () => {
    profileApi.removeAvatar.mockResolvedValue(RIYA)
    await renderPage({ ...RIYA, avatar_url: '/media/avatars/abc.png' })
    await userEvent.click(screen.getByRole('button', { name: 'Remove' }))
    expect(profileApi.removeAvatar).toHaveBeenCalled()
    expect(await screen.findByText('Profile photo removed')).toBeInTheDocument()
    expect(document.querySelector('img[src$="/media/avatars/abc.png"]')).toBeNull()
  })

  it('shows why a photo was rejected and keeps the old one', async () => {
    profileApi.uploadAvatar.mockRejectedValue(
      apiError(415, 'UNSUPPORTED_FILE_TYPE', 'avatar_file must be one of: .gif, .jpeg, .jpg, .png, .webp'),
    )
    await renderPage({ ...RIYA, avatar_url: '/media/avatars/old.png' })
    await userEvent.upload(
      screen.getByLabelText(/Profile photo \(JPG/),
      new File(['x'], 'me.png', { type: 'image/png' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('avatar_file must be one of')
    expect(document.querySelectorAll('img[src$="/media/avatars/old.png"]')).toHaveLength(2)
  })
})
