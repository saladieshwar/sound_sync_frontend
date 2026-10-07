import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // The API's CORS allow-list is port 5173; fail fast instead of silently moving to 5174.
  server: { port: 5173, strictPort: true },
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
    clearMocks: true,
  },
})
