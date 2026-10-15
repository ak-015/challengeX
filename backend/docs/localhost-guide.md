# Local Development Guide (Host on localhost)

This guide walks you through running the **Prisma-migrated backend** locally with a real Postgres database on `localhost`. The stack is Node 20 + Express + TypeScript, AI via NVIDIA NIM, data in universal Postgres via Prisma, Cloudinary signed uploads, and OTP email via Brevo (Resend fallback).

> The backend uses **only one database variable**: `DATABASE_URL` - any Postgres connection string. Here we point it at a database you run yourself on `localhost`.

---

## 1. Prerequisites

| Tool               | Minimum version | Notes                                                                                                                                                                                                    |
| ------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js            | 20 LTS          | Use `nvm` or the official installer                                                                                                                                                                      |
| npm                | 10+             | Bundled with Node                                                                                                                                                                                        |
| PostgreSQL         | 14+             | Only needed if you run your own DB locally                                                                                                                                                               |
| Docker (optional)  | -               | Fastest way to spin up Postgres without installing it                                                                                                                                                    |
| Cloudinary account | -               | Required in production; **only** credentials (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) are needed. Optional in local dev if you do not test signed uploads.               |
| AI providers       | -               | Required to test AI endpoints (`GROQ_API_KEY` / `GEMINI_API_KEY` / `NVIDIA_API_KEY` — at least one, plus `NIM_MODELS`). Local dev boots without it (`npm run dev` still starts), but AI routes will 503. |

---

## 2. Install a local Postgres database

### Option A - Docker (fastest, recommended)

```bash
# Pull and run a throwaway Postgres on localhost:5432
docker run -d \
  --name challenge-create-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=challenge_create \
  -p 5432:5432 \
  postgres:16-alpine

# Keep it running; stop with: docker stop challenge-create-postgres
```

### Option B - Native install (Windows/macOS/Linux)

Download from [postgresql.org/download](https://www.postgresql.org/download/) and remember the `postgres` superuser password + port `5432`.

Verify it works:

```bash
# If using Docker:
docker ps

# If native:
psql -U postgres -h localhost -c "SELECT 1;"
```

---

## 3. Create the database and `DATABASE_URL`

With Postgres running on `localhost:5432`:

| Setting  | Value                            |
| -------- | -------------------------------- |
| Host     | `localhost`                      |
| Port     | `5432`                           |
| Database | `challenge_create`               |
| User     | `postgres`                       |
| Password | `postgres` (or whatever you set) |

**Required env var** (all other DB-related values are gone):

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/challenge_create?sslmode=prefer
```

> `sslmode=prefer` works for local self-signed/HTTP Postgres; use `require` or `sslmode=disable` if your provider/OS enforces a specific setting. The app only needs a valid, reachable connection string.

---

## 4. Install dependencies

```bash
cd backend
npm install
```

- `package.json` scripts: `build` = `prisma generate && tsc -p tsconfig.build.json`, `postinstall` = `prisma generate`, plus `dev`, `typecheck`, `db:push`, `db:seed`, `db:migrate` / `prisma:migrate`, `prisma:generate`, `smoke`.
- `node_modules` + the generated Prisma Client are git-ignored (`node_modules/`, plus a `.gitignore`-friendly layout). Commit `package-lock.json`.

---

## 5. Configure your local `.env`

```bash
cp .env.example .env
```

Edit `.env` and fill in every `change-me` value. The **only database variable** is `DATABASE_URL` above; the rest are services:

| Category     | Variables                                                                                                                                                                                                                               |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server       | `PORT`, `NODE_ENV`, `FRONTEND_ORIGIN`                                                                                                                                                                                                   |
| Secrets      | `JWT_SECRET` (>=32 chars), `OTP_SECRET`                                                                                                                                                                                                 |
| Database     | `DATABASE_URL` (from step 3)                                                                                                                                                                                                            |
| AI providers | at least one of `GROQ_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY` (base URLs default, override with `GROQ_BASE_URL` / `GEMINI_BASE_URL` / `NIM_BASE_URL`); `NIM_MODELS` (comma-separated, optional `groq:`/`gemini:`/`nvidia:` prefix) |
| Search       | `SEARCH_PROVIDER=tavily` + `TAVILY_API_KEY`, or `BRAVE_API_KEY`                                                                                                                                                                         |
| Email        | `BREVO_API_KEY` + `BREVO_SENDER_EMAIL`/`NAME` (production); `RESEND_API_KEY` + `RESEND_FROM` (fallback)                                                                                                                                 |
| Cloudinary   | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`                                                                                                                                                                  |
| Admin        | `ADMIN_EMAILS` (comma-separated accounts to seed), `ADMIN_PASSWORD` (server-only seed input; minimum 8 characters, stored as bcrypt hashes)                                                                                             |

---

## 6. Push the Prisma schema to your local Postgres

This creates **all tables** (and RLS / the audit schema) exactly once. It is safe to re-run.

```bash
npx prisma db push
npm run db:seed
```

Expected output: the schema is applied, the Prisma client is generated, and each configured admin email is seeded as a verified account with a bcrypt-hashed password. `npm run db:seed` is safe to re-run and skips when `ADMIN_EMAILS` is empty.

> If you change `prisma/schema.prisma` later, re-run `npx prisma db push` (dev) or `npx prisma migrate dev` (prod-ready migrations). `npm run db:push` and either `npm run db:migrate` or `npm run prisma:migrate` apply schema changes; `npm run prisma:generate` regenerates the Prisma Client.

---

## 7. Start the dev server

```bash
npm run dev
```

You should see:

```
server listening { port: 8080, env: development }
```

The server listens on port `8080` (override with `PORT=3000 npm run dev`). In development, OTP codes are printed to the console when `DEV_LOG_OTP=true`.

> `PORT`, `NODE_ENV`, and `FRONTEND_ORIGIN` are read from `.env` (via `src/config/env.ts`). `DATABASE_URL` is read lazily by the `db` helper only when a request actually touches the DB, so a bad DB URL fails at the first query, not at boot.

---

## 8. Verify the boot + health check

```bash
curl -s http://localhost:8080/api/health
```

Expected JSON:

```json
{ "status": "ok", "service": "backend", "timestamp": "2026-10-11T..." }
```

A `200` means: env validated, Prisma client generated, Postgres reachable, and the Express app is listening.

---

## 9. Validate the backend build

```bash
npm run typecheck
npm run build
```

The typecheck uses `tsc -p tsconfig.json --noEmit`. The build generates Prisma Client and compiles the production server.

---

## 10. Production smoke check (optional)

After the API is live on Render, the post-deploy smoke script runs:

```bash
bash scripts/smoke.sh
```

This script is **not** needed for local dev, but it exists as a one-click post-deploy verification.

---

## 11. Useful commands

```bash
npm run dev        # start in watch mode (tsx)
npm run build      # prisma generate + tsc (production build -> dist/)
npm start          # run the compiled dist/index.js
npm run typecheck  # tsc --noEmit
npm run db:push    # prisma db push
npm run db:seed    # upsert verified admin accounts from ADMIN_EMAILS + ADMIN_PASSWORD
npm run db:migrate # prisma migrate dev
```

---

## 12. Troubleshooting

| Symptom                                                                          | Fix                                                                                                                                                                                                                                          |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Error: connect ECONNREFUSED localhost:5432`                                     | Postgres isn't running. Start Docker (`docker start challenge-create-postgres`) or the native server. Verify with `pg_isready` or `psql`.                                                                                                    |
| `prepared statement belongs to unknown transaction` / `h2` / `checkpoint` errors | Your DB schema is out of sync. Re-run `npx prisma db push`.                                                                                                                                                                                  |
| `DATABASE_URL` not used / "Unexpected env var"                                   | The codebase **only reads `DATABASE_URL`** now. Any leftover `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` are dead config (ignored).                                                                                                           |
| AI routes return 503                                                             | No provider key configured, credentials/model IDs wrong, or `NIM_MODELS` empty. Verify at least one of `GROQ_API_KEY` / `GEMINI_API_KEY` / `NVIDIA_API_KEY` and the exact model IDs (with the correct `provider:` prefix) for that provider. |
| OTP codes do not arrive                                                          | In dev, set `DEV_LOG_OTP=true` to print codes. In production, verify the sender in Brevo (senders are rejected if unverified) or use the Resend fallback.                                                                                    |
| `npm run dev` crashes on `prisma` import                                         | Run `npm install` again (generates the client in `postinstall`).                                                                                                                                                                             |
| Port 8080 already in use                                                         | Set `PORT=3000` in `.env` or `PORT=3000 npm run dev`.                                                                                                                                                                                        |
| `FRONTEND_ORIGIN` missing / invalid                                              | `src/config/env.ts` will refuse to boot with a clear list of missing variables. Fill in `.env` fully.                                                                                                                                        |

---

## 13. What changed from the original Supabase stack

- **Removed**: `backend/supabase/` (schema SQL, RLS, service-role access).
- **Added**: `prisma/schema.prisma` (universal Postgres), `prisma/client` (generated), `src/lib/db.ts` (single `getDb()`).
- **Env**: `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` -> single `DATABASE_URL`.
- **Queries**: every `.from()`, `.maybeSingle()`, `getDb().from(...)` call converted to `db(getDb().<table>.find.../create/update...)`; snake_case DTOs preserved via `toSessionRow`, `toUserRow`, `toSessionPatch` in `src/lib/rows.ts`.
- **Admin stats**: replaced the Postgres SQL function `admin_stats_json()` with a `Promise.all` aggregation in `src/routes/admin.ts`.
- **CI/CD**: `render.yaml` `buildCommand` -> `npm ci --include=dev && npx prisma db push && npm run build`; `DATABASE_URL` synced (`sync: false`).

---

## 14. Next step (production)

Once localhost works, deploy the same `backend/` to Render using the root `render.yaml` (API web service). Set `DATABASE_URL` to your production Postgres (Supabase, Neon, Render, Railway, self-hosted) and run `npx prisma db push` before starting. No other config changes are required - the app is fully database-agnostic.
