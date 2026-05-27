# AANM Hostinger Deployment

## Services

- Frontend: Hostinger Cloud/static app serving `frontend/dist`.
- Backend: Hostinger Cloud Node.js app rooted at `backend/`.
- Database: PostgreSQL on a Hostinger VPS.

## Required GitHub Secrets

```text
HOSTINGER_FRONTEND_HOST
HOSTINGER_FRONTEND_USER
HOSTINGER_FRONTEND_SSH_KEY
HOSTINGER_FRONTEND_PATH
HOSTINGER_BACKEND_HOST
HOSTINGER_BACKEND_USER
HOSTINGER_BACKEND_SSH_KEY
HOSTINGER_BACKEND_PATH
DATABASE_URL
ADMIN_USERNAME
ADMIN_PASSWORD
JWT_SECRET
ALLOWED_ORIGINS
```

## Frontend

Build locally with:

```bash
npm run build --workspace frontend
```

Deploy only:

```text
frontend/dist/
```

The frontend API base lives in:

```text
frontend/public/api-config.js
```

Update the production value before the final production build:

```js
'https://api.yourdomain.com'
```

## Backend

The backend app root is:

```text
backend/
```

Hostinger start command:

```bash
npm start
```

Backend production env example:

```env
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://aanm_user:password@postgres-host:5432/aanm
DATABASE_SSL=false
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
ADMIN_USERNAME=admin
ADMIN_PASSWORD=strong-production-password
JWT_SECRET=long-random-production-secret
JWT_EXPIRES_IN=8h
```

## SQLite to PostgreSQL Migration

After creating the PostgreSQL database and setting `DATABASE_URL`, run:

```bash
npm run migrate:postgres
```

If the SQLite file is not in the default legacy location, pass it explicitly:

```bash
npm run migrate:postgres -- --sqlite=/path/to/labs.db
```

The script migrates:

- `labs`
- `seminaires`
- `registrations`

It preserves IDs and resets PostgreSQL sequences after import.
