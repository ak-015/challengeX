# ChallengeX Admin

A standalone Vite + React 18 + TypeScript + Tailwind 3 app. **No code is shared with `../client`** (the few UI building blocks it needs are copied under `src/components` and `src/lib`). It has its own `package.json`, build, URL and Render static site. It talks to the same API (`/api/admin/*`, plus `/api/auth/login` and `/api/auth/me`).

```bash
cd admin
npm install                 # creates package-lock.json (commit it: Render uses `npm ci`)
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8080  (VITE_APP_URL optional)
npm run dev                 # http://localhost:5174
npm run typecheck && npm run build
```

**Important:** the API's `FRONTEND_ORIGIN` must list this site's origin too (comma-separated), otherwise the browser blocks the calls (CORS).

## Access

- Sign in on `/login` with an administrator account created by `npm run db:seed` in the backend. Configure `ADMIN_EMAILS` and `ADMIN_PASSWORD` in the backend environment, then seed. Passwords are stored as bcrypt hashes.
- A non-admin who signs in sees "Not an administrator" and no session is kept; their API calls get **403** from the server anyway. The client check is cosmetic: **the server enforces everything**.
- The token lives in this site's own `localStorage` (separate from the main app). A 401 or a suspension signs you out immediately.
- The built files are static and public to anyone who knows the URL (they contain no secrets). The site is `noindex`. Keep the URL unguessable, or put an allow-list in front of it (e.g. Cloudflare Access / IP rules) if you want the login page itself hidden.

## Pages

`/` Dashboard · `/users` · `/sessions` · `/shares` · `/system` (auto-refresh 10 s, pausable) · `/audit`. Hand-written SVG charts; tables become cards at 360 px; type-to-confirm for user deletion; confirm dialogs on every destructive action.

## Layout

```
admin/
├─ index.html · vite.config.ts · tailwind.config.js · tsconfig.json · .env.example
└─ src/
   ├─ main.tsx · App.tsx (routes) · AdminLayout.tsx · RequireAdmin.tsx · env.ts · index.css
   ├─ adminApi.ts · rules.ts · useAsync.ts           typed API + pure UI rules + hooks
   ├─ pages/    Login · Dashboard · Users · Sessions · Shares · System · Audit · NotFound
   ├─ ui/       AdminTable · Charts · Dialogs · Pagination · Pill · Skeleton · States
   └─ components/ lib/ store/ hooks/                 small copies of the shared building blocks
```
