# Local Development

This project has two Node.js applications:

- `backend`: Nest.js API server
- `frontend`: Next.js web app

The backend uses SQLite through Prisma. The frontend proxies API requests to the backend at `http://localhost:8080` by default.

## Prerequisites

- Node.js
- npm

The environment used to verify this setup was:

- Node.js `v22.17.0`
- npm `10.9.2`

## Backend Setup

Open a PowerShell terminal:

```powershell
cd C:\Users\nanpr\solo-coder-project\pingvin-share\backend
npm ci
```

Initialize the local SQLite database:

```powershell
New-Item -ItemType Directory -Force data
New-Item -ItemType File -Force data\pingvin-share.db
npx prisma db push
npx prisma db seed
```

Start the backend development server:

```powershell
npm run dev
```

The backend listens on:

- API: `http://localhost:8080/api`
- Health check: `http://localhost:8080/api/health`
- Swagger UI: `http://localhost:8080/api/swagger`

## Frontend Setup

Open another PowerShell terminal:

```powershell
cd C:\Users\nanpr\solo-coder-project\pingvin-share\frontend
npm ci
npm run dev
```

The frontend listens on:

- App: `http://localhost:3000`

## Development Workflow

Run both servers at the same time:

1. Backend: `backend > npm run dev`
2. Frontend: `frontend > npm run dev`

Then open:

```text
http://localhost:3000
```

The frontend API proxy defaults to:

```text
http://localhost:8080
```

Relevant frontend files:

- `frontend/src/pages/api/[...all].tsx`
- `frontend/src/middleware.ts`

## Verification Commands

Backend build:

```powershell
cd C:\Users\nanpr\solo-coder-project\pingvin-share\backend
npm run build
```

Frontend build:

```powershell
cd C:\Users\nanpr\solo-coder-project\pingvin-share\frontend
npm run build
```

Both builds were verified successfully.

## Notes

- The repository's `README.md` describes Docker as the recommended production-style setup.
- For secondary development, running the backend and frontend separately is more convenient.
- `backend/prisma/.env` sets the default database URL to `file:../data/pingvin-share.db`.
- On Windows, Prisma may fail with `P1003 Database pingvin-share.db does not exist` if the SQLite file has not been created yet. Creating `backend/data/pingvin-share.db` before `npx prisma db push` avoids this.
- ClamAV is optional. Without a local ClamAV service, the backend logs `ClamAV is not active`, which is fine for normal local development.
- The frontend build currently reports existing lint warnings and Next.js Edge Runtime warnings, but they do not block the build.
