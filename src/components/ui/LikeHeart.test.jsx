import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LikeHeart } from './icons'

const burst = (container) => container.querySelector('.animate-like-ring')

describe('LikeHeart', () => {
  it('celebrates only when the song becomes liked', () => {
    const { container, rerender } = render(<LikeHeart liked={false} songId={1} />)
    expect(burst(container)).toBeNull()

    rerender(<LikeHeart liked songId={1} />)
    expect(burst(container)).not.toBeNull()
    expect(container.querySelectorAll('.animate-like-spark')).toHaveLength(6)

    rerender(<LikeHeart liked={false} songId={1} />)
    expect(burst(container)).toBeNull()
  })

  it('stays still for a song that was already liked, or when the song changes', () => {
    const { container, rerender } = render(<LikeHeart liked songId={1} />)
    expect(burst(container)).toBeNull()

    rerender(<LikeHeart liked={false} songId={1} />)
    rerender(<LikeHeart liked songId={2} />)
    expect(burst(container)).toBeNull()
  })
})
