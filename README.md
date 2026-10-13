# ChallengeX

ChallengeX pressure-tests startup ideas, scores their risks, and turns surviving ideas into build roadmaps.

## Apps

- [Client](client/README.md): React application for idea analysis, verdicts, and roadmaps.
- [Admin](admin/README.md): separate administrator console.
- [Backend](backend/README.md): Express API, Prisma/Postgres persistence, AI providers, and signed media uploads.

## Local setup

Use Node 20+ and PostgreSQL. Configure backend variables from `backend/.env.example` and client/admin API URLs from their `.env.example` files. Keep secrets in the backend environment only.

```powershell
cd backend
npm install
npm run db:push
npm run db:seed
npm run dev
```

In separate terminals, run `npm install` and `npm run dev` from `client/` and `admin/`. The local URLs are `http://localhost:5173` and `http://localhost:5174`; the API listens on `http://localhost:8080`.

`ADMIN_EMAILS` and `ADMIN_PASSWORD` create verified administrator accounts through `npm run db:seed`. Passwords are stored as bcrypt hashes. Rerunning the seed updates seeded account credentials.

## Deploy

Use the root [Render Blueprint](render.yaml) for all services. Configure the server environment, set the API `FRONTEND_ORIGIN` and client `VITE_API_BASE_URL`, then verify the deployment with `backend/scripts/smoke.sh`.
