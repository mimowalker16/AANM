# Hostinger Migration Plan: PostgreSQL + Hostable Frontend Structure

## Summary
Use a **3-service Hostinger setup**:

- **Frontend server:** Hostinger Cloud static site/app serving the built frontend.
- **Backend server:** Hostinger Cloud Node.js app running Express.
- **Database server:** Hostinger VPS running PostgreSQL.

This matches Hostinger’s current limits: Hostinger supports Node.js on Cloud/VPS, but PostgreSQL requires VPS because it is not supported on Web/Cloud hosting plans. Sources: [Hostinger Node.js support](https://www.hostinger.com/support/1583661-is-node-js-supported-at-), [Hostinger PostgreSQL support](https://support.hostinger.com/en/articles/1583659-is-postgresql-supported-at-hostinger).

## Key Changes
- Restructure the repo into a deployable shape:
  ```text
  frontend/
    index.html
    about.html
    activities.html
    seminar-register.html
    ...
    assets/
    src/
    vite.config.js

  backend/
    server/
      index.js
      routes/
      controllers/
      middleware/
      database/
    package.json

  scripts/
    migrate-sqlite-to-postgres.js
  ```
- Move all frontend HTML/CSS/JS/assets into `frontend/`.
- Move Express backend and backend-only dependencies into `backend/`.
- Keep root-level scripts for local development and CI/CD orchestration.

## PostgreSQL Migration
- Replace `sqlite3` with `pg` in the backend.
- Convert SQLite schema to PostgreSQL:
  - `INTEGER PRIMARY KEY AUTOINCREMENT` → `SERIAL PRIMARY KEY`
  - `BOOLEAN DEFAULT 0` → `BOOLEAN DEFAULT false`
  - `DATETIME DEFAULT CURRENT_TIMESTAMP` → `TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP`
  - `research_areas TEXT` can stay as JSON string for minimum-risk migration.
- Keep the same API behavior:
  - `/api/labs`
  - `/api/labs/submit`
  - `/api/seminaires`
  - `/api/seminaires/:id/register`
  - `/api/admin/...`
- Add a migration script that reads current `server/database/labs.db` and inserts existing `labs`, `seminaires`, and `registrations` into PostgreSQL.
- Add backend env vars:
  ```env
  NODE_ENV=production
  PORT=3001
  DATABASE_URL=postgres://user:password@db-host:5432/aanm
  ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
  ADMIN_USERNAME=admin
  ADMIN_PASSWORD=strong-production-password
  JWT_SECRET=long-random-production-secret
  JWT_EXPIRES_IN=8h
  ```

## Frontend Hosting Changes
- Replace every hardcoded frontend API base:
  ```js
  location.protocol + '//' + location.hostname + ':3001'
  ```
  with one shared config value.
- Use production API URL:
  ```js
  const API_BASE = 'https://api.yourdomain.com';
  ```
- Use local dev API URL:
  ```js
  const API_BASE = 'http://localhost:3001';
  ```
- Configure Vite to build from `frontend/` into:
  ```text
  frontend/dist/
  ```
- Deploy only `frontend/dist/` to the Hostinger frontend server.

## Hostinger Deployment Shape
- Frontend:
  ```text
  Domain: https://yourdomain.com
  Hostinger target: Cloud/static frontend
  Build command: npm ci && npm run build
  Output folder: frontend/dist
  ```
- Backend:
  ```text
  Domain: https://api.yourdomain.com
  Hostinger target: Cloud Node.js app
  Start command: npm start
  App root: backend/
  ```
- Database:
  ```text
  Hostinger target: VPS
  Service: PostgreSQL
  Database: aanm
  User: aanm_user
  Remote access: allow backend server IP only
  Backups: daily pg_dump
  ```

## CI/CD With GitHub Actions
- Add one workflow with three jobs:
  - `build-frontend`: install frontend deps and run frontend build.
  - `build-backend`: install backend deps and run a backend startup/import check.
  - `deploy`: deploy frontend to Hostinger and trigger/redeploy backend.
- Store secrets in GitHub:
  ```text
  HOSTINGER_FRONTEND_HOST
  HOSTINGER_FRONTEND_USER
  HOSTINGER_FRONTEND_SSH_KEY
  HOSTINGER_BACKEND_HOST
  HOSTINGER_BACKEND_USER
  HOSTINGER_BACKEND_SSH_KEY
  DATABASE_URL
  ADMIN_USERNAME
  ADMIN_PASSWORD
  JWT_SECRET
  ALLOWED_ORIGINS
  ```
- Deploy frontend by uploading `frontend/dist/` to the Hostinger frontend web root.
- Deploy backend by SSHing into the Hostinger backend app/server, pulling the latest code, installing backend dependencies, and restarting the Node app.

## Test Plan
- Local tests:
  - Run backend against PostgreSQL using `DATABASE_URL`.
  - Run migration script from existing SQLite file.
  - Verify row counts for `labs`, `seminaires`, and `registrations`.
  - Run frontend dev server and confirm all API pages work.
- Production checks:
  - `https://yourdomain.com` loads frontend.
  - `https://api.yourdomain.com/api/health` returns healthy status.
  - Seminar registration writes to PostgreSQL.
  - Lab submission writes to PostgreSQL.
  - Admin login works with production credentials.
  - Admin dashboard can approve/delete labs and manage seminars.

## Assumptions
- Use **Hostinger Cloud + VPS**, as selected.
- Use **3 separate services**, as selected.
- Preserve and migrate the current SQLite data, as selected.
- Use `api.yourdomain.com` for the backend and `yourdomain.com` / `www.yourdomain.com` for the frontend.
- Keep `research_areas` stored as JSON text during the first migration to reduce risk; it can be upgraded to `JSONB` later.
