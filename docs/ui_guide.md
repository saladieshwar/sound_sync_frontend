# SoundSync UI Guide (FE)

Part 1 is for people using the app: every screen and how to use it. Part 2 is for engineers: how the frontend is wired to the REST API and the room WebSocket, enough to run and change it against the backend without reading all the code.

Run it: backend first ([`../../backend/docs/setup_guide.md`](../../backend/docs/setup_guide.md)), then `npm ci` and `npm run dev` in `frontend/`, and open `http://localhost:5173`.

## Part 1 — Screens and how to use them

### Screen and route list

| Route | Who can open it | Screen | Main actions |
| --- | --- | --- | --- |
| `/register` | Everyone | Register | Create an account (username, email, password of 8–72 characters); you are logged in and sent Home |
| `/login` | Everyone | Login | Log in; you return to the page you originally asked for |
| `/` | Logged in | Home | Categories, Albums, Recently Played, Liked Songs, All Songs; click a song to play it |
| `/search?q=` | Logged in | Search results | Songs whose title, artist or album contains the text (any letter case) |
| `/category/:name` | Logged in | Category | All songs in a category |
| `/album/:name` | Logged in | Album | All songs in an album |
| `/now-playing` | Logged in | Now Playing | Big view of the current song, like button, "Up Next" queue |
| `/room` | Logged in | Musical Room | Create a room, or join one by Room ID or join link |
| `/room/:roomId` | Logged in (joined) | In-room view | Listen in sync; the controller picks songs and drives playback |
| `/profile` | Logged in | Your profile | Add or change your photo; edit username, full name, phone number and bio |
| `/admin` | Admins only | Admin panel | Upload Song, Songs (edit, delete), Users, Rooms |
| anything else | Everyone | Not found | Link back Home |

On both forms, the eye button in the password field shows or hides the password.

Logged-out users who open a protected page go to `/login` first. Non-admins who open `/admin` go Home, and they never see the Admin link.

### Top bar (every logged-in page)

**SoundSync** logo (Home), **Home**, **Musical Room**, **Admin** (admins only), the search box (press Enter), your photo (or initial) and username — click it to open **Your profile** — and **Logout**.

### Your profile (`/profile`)

- **Photo**: **Upload photo** / **Change photo** saves straight away (`.jpg .jpeg .png .webp .gif`, up to 5 MB); **Remove** goes back to your initial. The photo appears in the top bar at once.
- **Personal details**: username (2–50 characters), full name, phone number (7–15 digits; `+`, spaces, `(`, `)` and `-` allowed) and a bio of up to 300 characters. **Save changes** is enabled once something changed; **Reset** undoes unsaved edits. Clearing an optional field removes it.
- Your email is shown but cannot be changed here.

### Playing music (footer player)

The footer is always visible after you start a song:

- **Play/Pause**, **Previous**, **Next**. The queue is the list you clicked the song from.
- **Previous** restarts the song if more than 3 s have played, otherwise it goes back one song. When a song ends, the next one starts; playback stops after the last.
- **Seek bar**: drag and release to jump. Keyboard arrows work too.
- **Volume** and **Mute**: remembered after a reload.
- **Heart**: like or unlike the song without interrupting it. Liked songs appear under **Liked Songs** on Home.
- Click the song title to open **Now Playing**.

Every song you start is added to **Recently Played** (most recent first).

### Musical Room (listen together)

1. **Create**: on **Musical Room**, type a name and press **Create Room**. You become the room's admin and its controller.
2. **Invite**: press **Copy join link** and send it, or share the 8-character **Room ID**.
3. **Join**: open the link and press **Join Room**, or type the Room ID (any letter case) on **Musical Room**.
4. **Listen**: everyone hears the same song at the same moment.
   - The status next to the Room ID shows **Live**, **Connecting…** or **Reconnecting…**.
   - If your device shows **Tap to hear the room**, tap it once; browsers block sound until you touch the page.
5. **Control** (controller only):
   - Pick a song from **Pick a song for the room**.
   - Use **Play/Pause for everyone** and the seek bar.
   - Listeners' controls are disabled, and the footer shows "Room controlled".
6. **Hand over control**: in **Participants**, the admin or the current controller presses **Give control** next to someone. The admin can always take control back (the button also appears next to their own name).
   - The list shows a green dot for people online, and the tags **Admin** and **Controller**.
7. **Leave**: press the red **Leave Room** button.
   - A listener simply leaves.
   - If the admin leaves, the room closes and everyone sees "The room was closed by its admin."

If your connection drops, the room page reconnects by itself and jumps back to the room's current position.

### Admin panel (`/admin`)

| Tab | What you can do |
| --- | --- |
| **Upload Song** | Title, artist, music director (optional), album (optional), category, duration in seconds, an audio file (`.mp3 .wav .ogg .oga .opus .m4a .aac .flac .webm`, up to 50 MB) and an optional cover (`.jpg .jpeg .png .webp .gif`, up to 5 MB). The song is searchable and playable immediately |
| **Songs** | All songs with **Edit** and **Delete** buttons. **Edit** opens a dialog to change the title, artist, music director, album, category, duration and cover (change, add or remove); only what you changed is sent, and **Cancel**, **Esc** or a click outside closes it without saving. **Delete** asks first, removes the song from every library, stops any room playing it for everyone in that room, and deletes its files unless another song uses them |
| **Users** | Every account with its role |
| **Rooms** | Active rooms, newest first |

Error messages from the server (wrong file type, file too large, missing fields) are shown above the form.

### Messages you may see

| Message | Meaning |
| --- | --- |
| Can't reach the server. Reconnecting… | You are logged in but the API is down; the app retries and continues by itself |
| Can't play this song | The audio file is missing or broken; press Play to retry |
| Only the current controller can change playback. | You are a listener in a room |
| Pick a song for the room first. | Play/seek pressed before any song was chosen |
| You are no longer in this room. | You left from another tab or device |

## Part 2 — How the frontend talks to the backend

### Configuration

`src/config.js` reads `VITE_API_BASE_URL` and `VITE_WS_BASE_URL` (optional, set before `npm run build`). If they are not set, the app uses port 8000 on the same host that served the page, so a phone that opens `http://192.168.1.20:5173` talks to `http://192.168.1.20:8000`. `mediaUrl(path)` puts the API address in front of `/media/...` URLs for audio and cover images.

### REST (axios)

`src/api/client.js` is the single axios instance:

- **Token in:** every request gets `Authorization: Bearer <token>` from `localStorage` (`soundsync_token`).
- **401 out:** any `401` response removes the token and fires a `soundsync:unauthorized` window event; `AuthContext` listens for it and logs out.
- **Errors:** `getApiError(err)` returns the backend's `{ code, message, details }` ([error catalogue](../../backend/docs/error_catalogue.md)); for `VALIDATION_ERROR` the message names the first bad field. If there is no response at all, it returns `NETWORK_ERROR`.

One module per backend area. OpenAPI (`http://localhost:8000/docs`) is the source of truth for every shape:

| Module | Functions → endpoints | Used by |
| --- | --- | --- |
| `api/auth.js` | `register` → `POST /auth/register`, `login` → `POST /auth/login`, `getMe` → `GET /auth/me` | `AuthContext` |
| `api/songs.js` | `listSongs` → `GET /songs`, `getSong` → `GET /songs/{id}`, `searchSongs` → `GET /songs/search`, `listCategories` → `GET /songs/categories`, `songsByCategory` → `GET /songs/category/{name}`, `listAlbums` → `GET /songs/albums`, `songsByAlbum` → `GET /songs/album/{name}` | Home, Search, Browse, Room, Admin |
| `api/library.js` | `getLikedSongs`, `likeSong`, `unlikeSong` → `/users/me/liked-songs[/{id}]`; `getRecentlyPlayed`, `logPlay` → `/users/me/recently-played[/{id}]` | `LibraryContext` |
| `api/rooms.js` | `createRoom` → `POST /rooms`, `getRoom` → `GET /rooms/{id}`, `joinRoom`, `leaveRoom`, `transferAccess` → `POST /rooms/{id}/join`, `/leave`, `/transfer-access` | Room pages |
| `api/profile.js` | `updateProfile` → `PATCH /users/me`, `uploadAvatar` → `PUT /users/me/avatar` (multipart), `removeAvatar` → `DELETE /users/me/avatar` | Profile page |
| `api/admin.js` | `uploadSong` → `POST /admin/songs` (multipart), `updateSong` → `PATCH /admin/songs/{id}`, `setSongCover` → `PUT /admin/songs/{id}/cover` (multipart), `removeSongCover` → `DELETE /admin/songs/{id}/cover`, `deleteSong` → `DELETE /admin/songs/{id}`, `listUsers` → `GET /admin/users`, `listRooms` → `GET /admin/rooms` | Admin page |
`api/useApiQuery.js` is a small hook that gives pages `{ data, loading, error, retry }` for one request.

### App state (React contexts)

| Context | Holds | Talks to |
| --- | --- | --- |
| `AuthContext` | `user`, `token`, `login`, `register`, `logout`, `offline`, `updateUser` (the profile page passes in the server's updated user) | Checks a stored token with `GET /auth/me` on start. Logs out on `4xx`; retries with backoff on network errors or `5xx`, showing "Reconnecting…" |
| `LibraryContext` | liked song ids, recently played | Library endpoints; loaded after login |
| `PlayerContext` | the one `<audio>` element, queue, position, volume | Calls `logPlay` once per song start. `syncTo(...)` lets the room page drive playback, and `roomLocked` disables the footer controls in a room |

`routes/ProtectedRoute.jsx` and `routes/AdminRoute.jsx` guard routes. They only hide screens: the backend still checks every request.

### Room WebSocket

Contract: [`../../backend/docs/websocket_contract.md`](../../backend/docs/websocket_contract.md). Flow in the app:

1. `RoomPage` calls `getRoom(id)`. If the answer is `403 NOT_ROOM_PARTICIPANT`, it shows the **Join Room** prompt, which calls `joinRoom(id)`.
2. Once the user is a participant, `realtime/useRoomSocket.js` opens `WS_BASE_URL/rooms/{id}/ws?token=…`.
   - It sends 5 `time_sync` messages and then one every 30 s, feeding `realtime/serverClock.js`.
   - It reconnects every 2 s after a network drop.
   - It stops for good on close codes `1000` and `1008`.
3. `RoomPage.onMessage` handles each event:
   - `room_state` and playback events set the room timeline. A `pause` with `song_id: null` (sent by the server when an admin deletes the room's song) stops the room audio. `applyPlayback` loads the song with `getSong` and calls `PlayerContext.syncTo`. `realtime/events.js` then keeps the audio within about 40 ms of the room (no playback-rate changes).
   - `access_transfer`, `user_joined` and `user_left` update the controller and participant list.
   - `room_closed` returns to `/room` with a notice.
   - `error` shows a friendly message (`ROOM_ERROR_MESSAGES`).
4. The controller's buttons send `song_change`, `play`, `pause` and `seek`. The local player changes only when the server's broadcast comes back, so the controller's device follows the same timeline as everyone else.
5. **Leave Room** calls `leaveRoom(id)`, stops the audio and goes back to `/room`.

### Tests

`npm test` runs Vitest with React Testing Library.

- Tests sit next to the code (`*.test.jsx`).
- `src/testUtils.jsx` provides `FakeAudio` (a media element) and `MockWebSocket` (plays the server side of the room).
- `src/journey.test.jsx` drives the real `App` through register → home → search → player → room → leave in one session.
- Two-browser tests against the real backend: `python -m scripts.browser_e2e` in `backend/`.
- Layout and accessibility of every screen at phone, tablet and desktop size: `python -m scripts.ux_check` in `backend/` (screenshots and sign-off in [`ux_review.md`](../../backend/docs/qa/ux_review.md)).
