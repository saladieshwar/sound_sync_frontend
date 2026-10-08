import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { LibraryProvider } from './context/LibraryContext'
import { PlayerProvider } from './context/PlayerContext'
import '@fontsource-variable/inter'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <LibraryProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </LibraryProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
