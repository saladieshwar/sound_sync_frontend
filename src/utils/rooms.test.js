import { describe, expect, it } from 'vitest'
import { extractRoomId } from './rooms'

describe('extractRoomId', () => {
  it.each([
    ['AB12CD34', 'AB12CD34'],
    ['  ab12cd34 ', 'AB12CD34'],
    ['http://localhost:5173/room/AB12CD34', 'AB12CD34'],
    ['http://192.168.1.20:5173/room/ab12cd34/', 'AB12CD34'],
    ['https://soundsync.app/room/AB12CD34?ref=chat#top', 'AB12CD34'],
  ])('reads %j as %s', (input, expected) => {
    expect(extractRoomId(input)).toBe(expected)
  })

  it.each(['', 'abc', 'AB12CD345', 'http://localhost:5173/', 'AB12-CD34'])(
    'rejects %j',
    (input) => {
      expect(extractRoomId(input)).toBeNull()
    },
  )
})
