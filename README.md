# sendmemes-ui

Vue 3 + Vite + TypeScript admin dashboard for
[`sendmemes-discord-bot`](https://github.com/AaronCheng1996/sendmemes-discord-bot).
Pulled into the bot repo as a git submodule under `ui/`.

The UI talks to the bot's `/v1/admin/*` REST API. Auth is a static
`X-Admin-Key` header; the dashboard collects it on a dedicated login page and
holds it only in `sessionStorage` (it is dropped when the tab closes).

## Features

### Auth & connection

- **Login page** (`/login`) — collects API base URL + admin key, verifies them
  against `/healthz` and `/v1/admin/albums?limit=1` before storing.
- **Connection page** (`/connection`) — separate tab for changing the API
  base URL, re-testing the connection, swapping the session key, or signing
  out. The key never appears in the global header anymore.
- API base URL is persisted in `localStorage` (it's safe to remember). The
  admin key is **session-only** and a legacy `localStorage` key from earlier
  builds is cleared on load.
- Router guard redirects unauthenticated users back to `/login` and remembers
  the original target with `?redirect=`.

### Albums & Images pages

- Paginated tables (server-side) with first / prev / next / last and a
  per-page selector. Pagination controls render at both the top and the
  bottom of the table.
- **Preview thumbnails** rendered from `preview_url` in the API response:
  - Sizes: Off / Small / Medium / Large, switched from a dropdown next to the
    page-size selector. Persisted in `localStorage`.
  - Medium and Large slots are portrait so phone-shaped photos are not
    cropped; full-size preview floats on hover without affecting layout.
- **Toolbar** at the top of each table:
  - Free-text filter with a column selector (ID, Name, Rating, Cover, etc.)
    that refines the **current page** locally.
  - Refresh (re-fetches the current page) and a primary **Create** button on
    the far right that opens a modal.
- **Sortable headers** — click a header to sort the current page; click
  again to flip direction (↑/↓).
- **Album cover icon** uses matching circles: filled green check for "has
  cover", grey ring for "no cover".
- **Images page** keeps the server-side `album_id` scope alongside the
  client filter so the URL still drives the API request.

### Schedule page

- Loads the effective schedule for a guild (channel, interval, history size)
  with the source of each value (DB override vs. env fallback).
- Update the schedule for a guild and persist it via `PUT /v1/admin/schedule`.

### Misc

- Light/dark theme toggle, persisted in `localStorage`.
- Toast notifications for API errors, mutation results, and connectivity
  warnings.
- Health pill in the header tracks `/healthz` reachability.

## Stack

- Vue 3 (`<script setup>`, Composition API)
- Vue Router 4 (history mode)
- Vite + TypeScript
- Plain CSS (single `style.css`, theme-aware variables)
- No state library — small composables under `src/composables/` (connection,
  preview size, page size, toasts).

## Project layout

```
src/
  App.vue
  main.ts
  router/index.ts          # routes + auth guard
  composables/             # useConnection, usePageSize, usePreviewSize, useToast
  components/
    Pagination.vue         # shared pager + page-size + preview-size dropdown
    ToastStack.vue
  services/adminApi.ts     # fetch wrapper + admin endpoints
  types/admin.ts           # API DTO types
  views/
    LoginPage.vue
    ConnectionPage.vue
    AlbumsPage.vue
    ImagesPage.vue
    SchedulePage.vue
  style.css
```

## Run

```bash
npm install
npm run dev
```

The dev server binds to <http://localhost:5173> by default. The bot's CORS
allow-list is currently `*` for development; tighten it before deploying.

## Build

```bash
npm run build
npm run preview
```

## Backend requirements

- Bot service running and serving `/v1/admin/*`.
- Requests carry an `X-Admin-Key` header equal to the bot's `ADMIN_API_KEY`.
- For preview thumbnails the bot's `HTTP_PUBLIC_URL` should be reachable from
  the browser (otherwise pCloud-hosted preview URLs still work, but local
  fallback URLs will not).

## Roadmap

- Server-side filter / sort parameters for albums and images (current
  controls only refine the loaded page).
- Audit-log viewer wired to a future `/v1/admin/audit-logs` endpoint.
- Bulk import / move tools for images.
- Per-environment build that bakes in `API base URL` so non-dev deployments
  don't need the user to re-enter it.
- Optional CSP nonce + same-origin deployment so the admin key can be moved
  out of the browser entirely (cookie/HTTP-only session).
