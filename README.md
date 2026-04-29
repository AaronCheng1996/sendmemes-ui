# SendMemes UI

Frontend admin panel for `sendmemes-discord-bot`, built with Vite + Vue + TypeScript.

## Features

- Albums CRUD (`/v1/admin/albums`)
- Images CRUD (`/v1/admin/images`)
- Schedule settings read/update (`/v1/admin/schedule`)
- API Base URL and `ADMIN_API_KEY` editable in UI
- `API Base URL` and `ADMIN_API_KEY` persisted in browser localStorage

## Run

```bash
npm install
npm run dev
```

Default dev URL is shown by Vite (usually `http://localhost:5173`).

## Build

```bash
npm run build
npm run preview
```

## Backend Requirements

- Backend should run and expose `/v1/admin/*` routes.
- Requests include `X-Admin-Key` header and require valid `ADMIN_API_KEY`.
