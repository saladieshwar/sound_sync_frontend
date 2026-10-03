# SoundSync Frontend

React 19 + Vite + Tailwind CSS client for SoundSync (handbook stack **FE**).

## Run

```powershell
copy .env.example .env
npm install
npm run dev        # http://localhost:5173
```

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8000` | REST API (BE) |
| `VITE_WS_BASE_URL` | `ws://localhost:8000` | Room WebSocket (RT) |

The backend must be running (see the backend README). The login screen and navbar show **API online / offline** from `GET /health`.

## Routes

| Route | Access | Screen |
| --- | --- | --- |
| `/register` | Public | Register |
| `/login` | Public | Login |
| `/` | Logged in | Home: categories, albums, recently played, liked songs |
| `/search?q=` | Logged in | Search results |
| `/category/:name`, `/album/:name` | Logged in | Browse |
| `/now-playing` | Logged in | Now Playing |
| `/room` | Logged in | Musical Room: create / join |
| `/room/:roomId` | Logged in | In-room view |
| `/admin` | Admin | Admin panel: upload song, users, rooms |

## Structure

| Path | Purpose |
| --- | --- |
| `src/api/` | Axios client per BE resource; OpenAPI (`/docs` on the backend) is the source of truth |
| `src/context/` | `AuthContext`, `LibraryContext`, `PlayerContext` |
| `src/realtime/` | WebSocket event constants and `useRoomSocket`; mirrors `backend/docs/websocket_contract.md` |
| `src/routes/` | `ProtectedRoute`, `AdminRoute` |
| `src/pages/`, `src/components/` | Screens and shared UI |

Key controls expose `data-testid` attributes for QA.

## Tests

```powershell
npm test
```

Vitest + React Testing Library (jsdom). Tests sit next to the code they cover (`*.test.jsx`); `src/testUtils.jsx` renders the auth route tree from `App.jsx`. Auth coverage: `AuthContext`, `ProtectedRoute` / `AdminRoute`, `LoginPage`, `RegisterPage`, and the API client's token handling.
