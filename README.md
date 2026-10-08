# SoundSync Frontend

React 19 + Vite + Tailwind CSS client for SoundSync (handbook stack **FE**).

| Document | For |
| --- | --- |
| [`docs/ui_guide.md`](docs/ui_guide.md) | Every screen and how to use it; how the frontend uses the REST API and the room WebSocket |
| [`../backend/docs/setup_guide.md`](../backend/docs/setup_guide.md) | Building and running the whole app on a clean machine; all settings |
| [`../backend/docs/documentation_checklist.md`](../backend/docs/documentation_checklist.md) | Index of all project documentation |

## Run

Needs Node.js 20.19+ or 22.12+ and the backend running on port 8000.

```powershell
copy .env.example .env   # optional, see below
npm ci
npm run dev        # http://localhost:5173 (fixed port; the API's CORS list expects it)
```

| Command | Does |
| --- | --- |
| `npm test` | Unit, component and journey tests (Vitest) |
| `npm run lint` | oxlint |
| `npm run build` | Production files in `dist/` (set `VITE_*` first) |
| `npm run preview` | Serve `dist/` locally |

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://<page host>:8000` | REST API (BE) |
| `VITE_WS_BASE_URL` | `ws://<page host>:8000` | Room WebSocket (RT) |

Both are optional: by default the app talks to port 8000 on whatever host served the page, so `http://localhost:5173` uses `localhost:8000` and a phone opening `http://192.168.1.20:5173` uses `192.168.1.20:8000`.

The backend must be running (see the backend README). The login screen and navbar show **API online / offline** from `GET /health`.

### Two devices in one Musical Room

Run `npm run dev -- --host` and start the backend with `--host 0.0.0.0` (details in the backend README, "Multi-device room testing"). Open `http://<LAN-IP>:5173` on both devices, create a room on one, and open the join link (or type the Room ID) on the other. Browsers block audio until you interact with the page; if **Tap to hear the room** appears, tap it once.

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
| `/admin` | Admin | Admin panel: Upload Song, Songs (delete), Users, Rooms |
| `*` | Public | Not found |

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

Musical Room coverage (Phase 5): `RoomLandingPage` (create, join by Room ID or link), `RoomPage` (join prompt, in-room view, controller and listener sync, control transfer, autoplay unlock, leave, room closed, reconnect), `ParticipantList`, `LeaveRoomButton`, `useRoomSocket` (reconnect rules), and the sync helpers in `src/realtime/events.js`. `MockWebSocket` in `src/testUtils.jsx` plays the server side.

Phase 6: `journey.test.jsx` (register → home → search → player → room → leave in one session, real `App`), `AdminPage.test.jsx` (upload, delete, users, rooms), server-clock jitter cases, and the auth retry while the API is unreachable.

Phase 8 (release 1.0.0): login and register fields are named for screen readers and password managers, with errors announced (`LoginPage`, `RegisterPage` tests); the room stops for everyone when an admin deletes the song it is playing (`RoomPage` test). The wait limit for `findBy…` / `waitFor` is 3 s for the whole suite (`src/setupTests.js`) so a busy machine does not cause false failures. Every screen is also checked at phone, tablet and desktop size with `python -m scripts.ux_check` in `backend/` (results: `backend/docs/qa/ux_review.md`).

`npm run lint` reports 4 known warnings (React fast-refresh and React compiler hints) and no errors; they do not affect behaviour, which the tests cover.
