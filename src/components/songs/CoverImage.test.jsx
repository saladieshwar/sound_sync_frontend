import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CoverImage from './CoverImage'

describe('CoverImage', () => {
  it('renders the cover from the media server', () => {
    render(<CoverImage src="/media/covers/calm-skies.svg" label="Calm Skies" />)
    const img = screen.getByRole('img', { name: 'Calm Skies' })
    expect(img.tagName).toBe('IMG')
    expect(img.getAttribute('src')).toMatch(/\/media\/covers\/calm-skies\.svg$/)
  })

  it('shows a placeholder when there is no cover', () => {
    render(<CoverImage src={null} label="Quiet Rooms" />)
    expect(screen.getByRole('img', { name: 'Quiet Rooms' }).tagName).toBe('SPAN')
  })

  it('falls back to the placeholder when the image fails to load', () => {
    render(<CoverImage src="/media/covers/missing.jpg" label="Missing" />)
    fireEvent.error(screen.getByRole('img', { name: 'Missing' }))
    expect(screen.getByRole('img', { name: 'Missing' }).tagName).toBe('SPAN')
  })
})
