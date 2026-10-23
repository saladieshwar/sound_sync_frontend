import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

// The default 1 s is too tight when all test files run in parallel on a busy machine.
configure({ asyncUtilTimeout: 3000 })

// jsdom does not implement matchMedia; default to a desktop-width viewport for layout branches.
if (typeof window.matchMedia !== 'function') {
  window.matchMedia = (query) => ({
    matches: query.includes('min-width: 1024px'),
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })
}

afterEach(() => {
  cleanup()
  localStorage.clear()
})
