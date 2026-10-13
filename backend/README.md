# ChallengeX API

Node 20 + Express + TypeScript (strict). AI via NVIDIA NIM, data in universal Postgres via Prisma, Cloudinary signed uploads, OTP email via Brevo (Resend fallback). No SMTP anywhere.

```
backend/
├─ .env.example            all env vars (copy to .env)
├─ package.json            exact-pinned versions (verify with `npm outdated`)
├─ render.yaml             Render blueprint (server only)
├─ prisma/schema.prisma    universal Postgres schema (any provider)
├─ scripts/smoke.sh        post-deploy smoke test
├─ src/
│  ├─ index.ts · app.ts    boot, graceful shutdown, middleware, routing
│  ├─ config/env.ts        zod env validation (fails fast)
│  ├─ lib/                 logger, errors, db, jwt, crypto, json-extract, lru, semaphore, prompt-safety, ...
│  ├─ middleware/          auth (re-checks the DB every request), rate limits, request-id, error handler
│  ├─ routes/              auth, uploads(+profile), shares, trials, ideas, roadmaps, admin
│  └─ services/
│     ├─ ai/               nimClient (ADAPTER), modelPool (load balancer), pools, generateJson, aiEvents
│     ├─ search/           tavily + brave adapters, cache/dedupe/retry service
│     ├─ email/            brevo + resend adapters, template, fallback sender
│     ├─ cloudinary/       signing + asset adapter (ADAPTER)
│     └─ engine/           constants, scoring, logic, schemas, prompts, graphValidator, trial/ideas/roadmap services
└─ prisma/seed.ts          idempotent verified-admin seed
```

> Database is universal Postgres via Prisma (`prisma/schema.prisma`): only `DATABASE_URL` is required — works with Supabase, Neon, Render, Railway, self-hosted, etc.

## Run locally

```bash
cd backend
npm install                # creates package-lock.json (commit it: Render uses `npm ci`)
cp .env.example .env       # fill it in
# 1) npm run db:push           # creates/updates schema on ANY Postgres DATABASE_URL (safe to re-run)
npm run db:seed              # create/update verified admin accounts from ADMIN_EMAILS + ADMIN_PASSWORD
npm run typecheck
npm run build
npm run dev                 # http://localhost:8080
```

In development, set `DEV_LOG_OTP=true` to print OTP codes to the console (ignored outside development).

## Env table

| Var                                                                                       | Required                                  | Where to get it                                                                                                                                                                                                                    |
| ----------------------------------------------------------------------------------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PORT, NODE_ENV, FRONTEND_ORIGIN                                                           | yes                                       | FRONTEND_ORIGIN = your client URL(s), comma-separated, no trailing slash                                                                                                                                                           |
| JWT_SECRET (≥32), OTP_SECRET                                                              | yes                                       | `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`                                                                                                                                                         |
| DATABASE_URL                                                                              | yes                                       | any Postgres connection string (Supabase / Neon / Render / Railway / self-hosted)                                                                                                                                                  |
| At least one AI key (`GROQ_API_KEY` / `GEMINI_API_KEY` / `NVIDIA_API_KEY`) + `NIM_MODELS` | yes                                       | console.groq.com/keys, aistudio.google.com/apikey, or build.nvidia.com. Prefix model IDs with `groq:`/`gemini:`/`nvidia:` to route to a provider (unprefixed = NVIDIA); mixing providers in one pool gives multi-provider failover |
| `GROQ_BASE_URL`, `GEMINI_BASE_URL`, `NIM_BASE_URL`                                        | no                                        | OpenAI-compatible base URLs; sensible defaults are built in                                                                                                                                                                        |
| NIM_VERDICT_MODELS                                                                        | no                                        | stronger models for verdict/roadmap; falls back to NIM_MODELS                                                                                                                                                                      |
| NIM_MAX_CONCURRENCY                                                                       | no (4)                                    | global cap on simultaneous NIM calls                                                                                                                                                                                               |
| NIM_USE_RESPONSE_FORMAT                                                                   | no (false)                                | enable only if your models support `response_format: json_object`                                                                                                                                                                  |
| SEARCH_PROVIDER + TAVILY_API_KEY or BRAVE_API_KEY                                         | yes                                       | tavily.com / brave.com/search/api                                                                                                                                                                                                  |
| BREVO_API_KEY, BREVO_SENDER_EMAIL, BREVO_SENDER_NAME                                      | one email provider required in production | Brevo → SMTP & API → API keys. **The sender must be verified in Brevo** (Senders & IP), else sends are rejected                                                                                                                    |
| RESEND_API_KEY, RESEND_FROM                                                               | fallback                                  | resend.com. **The domain must be verified**; the sandbox sender only mails your own address                                                                                                                                        |
| CLOUDINARY_CLOUD_NAME / API_KEY / API_SECRET                                              | yes                                       | Cloudinary → Dashboard                                                                                                                                                                                                             |
| ADMIN_EMAILS                                                                              | no                                        | comma-separated emails seeded as verified administrators by `npm run db:seed`; seeded accounts are protected                                                                                                                       |
| ADMIN_PASSWORD                                                                            | for seeding                               | server-only seed input (minimum 8 characters); bcrypt-hashed into the user row; never use a `VITE_` prefix                                                                                                                         |
| DEV_LOG_OTP                                                                               | no                                        | dev only                                                                                                                                                                                                                           |

## Things to VERIFY (adapters are isolated, I could not test live APIs)

Each lives in one file. Check the request shape against the current docs before relying on it:
`services/ai/nimClient.ts` (NIM chat + `/models`), `services/search/tavily.ts`, `services/search/brave.ts`, `services/email/brevo.ts`, `services/email/resend.ts`, `services/cloudinary/adapter.ts` (signing, incoming `transformation`, `api.resource`).

## curl walkthrough

```bash
B=http://localhost:8080
curl $B/api/health

# signup → OTP (printed in the console when DEV_LOG_OTP=true) → token
curl -s -X POST $B/api/auth/signup -H 'content-type: application/json' \
  -d '{"email":"me@example.com","password":"correct-horse-1","displayName":"Me"}'
TOKEN=$(curl -s -X POST $B/api/auth/verify-otp -H 'content-type: application/json' \
  -d '{"email":"me@example.com","code":"123456"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
curl -s -X POST $B/api/auth/login -H 'content-type: application/json' -d '{"email":"me@example.com","password":"correct-horse-1"}'
AUTH="authorization: Bearer $TOKEN"

# trial
T=$(curl -s -X POST $B/api/trials -H "$AUTH" -H 'content-type: application/json' \
  -d '{"idea":"An app that lets farmers photograph crop leaves and get disease diagnoses offline.","mode":"stress_test"}')
ID=$(echo "$T" | sed -n 's/.*"id":"\([^"]*\)".*/\1/p')

# repeat next → answer until the exact `progress.plannedTotal` is reached
Q=$(curl -s -X POST $B/api/trials/$ID/next -H "$AUTH")                       # question, extension offer, or {done:true}; progress includes plannedTotal
QID=$(echo "$Q" | sed -n 's/.*"question":{"id":"\([^"]*\)".*/\1/p')
curl -s -X POST $B/api/trials/$ID/answer -H "$AUTH" -H 'content-type: application/json' -d "{\"questionId\":\"$QID\",\"answer\":\"They would sync when they reach town.\"}"
curl -s -X POST $B/api/trials/$ID/answer -H "$AUTH" -H 'content-type: application/json' -d "{\"questionId\":\"$QID\",\"skipped\":true}"   # (idempotent: 2nd call is a no-op)

# If /next returns an extension offer, choose exactly one:
curl -s -X POST $B/api/trials/$ID/extend -H "$AUTH" -H 'content-type: application/json' -d '{"action":"continue"}'
curl -s -X POST $B/api/trials/$ID/extend -H "$AUTH" -H 'content-type: application/json' -d '{"action":"verdict"}'    # decline; verdict is marked lower confidence

curl -s -X POST $B/api/trials/$ID/verdict -H "$AUTH"                          # second call returns the stored result
curl -s "$B/api/trials?kind=trial&page=1" -H "$AUTH"
curl -s -X POST $B/api/roadmaps -H "$AUTH" -H 'content-type: application/json' -d "{\"trialId\":\"$ID\",\"budget\":\"$200\"}"
curl -s $B/api/admin/stats -H "$AUTH"                                          # 403 unless admin
```

Model IDs contain `/`, so reset them with `POST /api/admin/models/meta%2Fllama-3.1-8b-instruct/reset` (URL-encode the id).

## Operational checklist

- [ ] signup → OTP email arrives → verify → login works
- [ ] unverified login → `EMAIL_NOT_VERIFIED` + new OTP · suspended → `ACCOUNT_SUSPENDED`
- [ ] full 7–15 question trial + verdict through curl; second `/verdict` returns the identical stored result
- [ ] `NIM_MODELS="bad-id,good-id"` still works (bad-id disabled after one 404, logged as "model bad-id rejected: check ID/access")
- [ ] two simultaneous requests land on different models (`/api/admin/system` shows both with inflight)
- [ ] `GET /api/health` answers instantly with no DB access
- [ ] public share by slug shows no email/user id; revoked → 404
- [ ] tampered `publicId` → 403 `UPLOAD_NOT_OWNED`
- [ ] demoted/suspended admin loses access on the very next request

## Behaviour notes & decisions

- **Auth is re-checked against the DB on every request**, so demoting or suspending a user kills their access immediately (no waiting for JWT expiry).
- **Admin accounts:** `npm run db:seed` upserts each `ADMIN_EMAILS` account as verified/admin using a bcrypt hash of `ADMIN_PASSWORD`. Re-running synchronizes those seeded credentials. Seeded admins can never be suspended/demoted/deleted; nobody can do that to themselves; the last active admin can't be removed.
- **Sessions are private**; a copy is exposed only when the owner creates a share (an anonymised snapshot, revocable). Deleting a trial also deletes its shares.
- **Roadmap generation also creates a `kind='roadmap'` session** so history lists every kind in one place. Roadmaps are only generated from completed BUILD/PIVOT trials (KILL → `NOT_SURVIVING`).
- **Assumptions:** the assessment of an answer is produced by the _next_ `/next` call, so high/medium assessments are added to `assumptions` there; skipped questions add their "Unanswered:" assumption immediately in `/answer`.
- **Coverage rule is literal:** while any category is uncovered, the next question must come from an uncovered category (so the first 7 questions cover all 7). Violations get one correction call, then the server forces the category with a built-in fallback question.
- **Trial question count:** after competitor research, the server stores an AI-planned exact total from 7–15. One optional extension of 2 or 3 questions may be offered when it fits under 15; `POST /api/trials/:id/extend` accepts `continue` or `verdict`. Declining lowers verdict confidence. Apply schema changes with `npm run db:push`.
- **Schema additions** beyond the spec: `sessions.version` (optimistic locking), `sessions.interrogation_done`, `roadmaps.title`, `admin_audit`. Graph nodes also carry an optional `decisionField` (techStack|marketing|team|timeline|budget|platform) so the server can verify "a decision node exists for every undecided field".
- **Graph rule interpretation:** the "chosen path" = nodes reachable from the start via `recommended`/`normal` edges. A high-difficulty node there needs `difficultyNote` and a `betterPath` node id that is the target of an `alternate` edge from that node or its direct predecessor.
- **Avatar crop:** `POST /api/uploads/sign {purpose:'avatar', crop:{x,y,width,height}}` — coordinates are in the ORIGINAL image's pixels (the client scales its crop box to the natural image size). The server signs `c_crop` → `c_fill 256×256`; without `crop` it uses a face-aware 256×256 fill.
- The client must upload to Cloudinary using exactly `uploadUrl` with the returned `params` + `timestamp` + `api_key` + `signature` + `file`.

## Troubleshooting

- **First request is slow (30–60 s):** Render free sleeps when idle. `/api/health` is instant once awake; ping it from the client on load, or use an uptime pinger.
- **OTP not arriving:** check `/api/admin/system` → `recentFailures` (provider + status, no secrets). Brevo: sender not verified. Resend: domain not verified. Check spam. In dev use `DEV_LOG_OTP=true`.
- **`AI_BUSY` / 429 rate-limit:** free models rate-limit. Add model IDs across multiple providers, lower `NIM_MAX_CONCURRENCY`, or reset a model in the admin API. When all models are cooling down, the API returns a `Retry-After` hint and the client displays it. A 401/403/404 disables a model for the process: fix the ID/access and restart (or reset it).
- **`AI_BAD_OUTPUT`:** a model returned unusable JSON twice; retry (state is untouched). Prefer instruction-tuned models for `NIM_VERDICT_MODELS`.
- **Cloudinary PDF won't open (401/blocked):** Cloudinary Console → Settings → Security → **"PDF and ZIP files delivery"** is disabled by default for new accounts; enable it (and check "Restricted media types"). PNGs are unaffected.
- **Env error on boot:** the message lists each missing/invalid variable.

## Known limitations

- Third-party request shapes (NIM, Tavily, Brave, Brevo, Resend, Cloudinary) are from memory of their docs; see "Things to VERIFY".
- Cloudinary cannot enforce a max upload size through a signed request; avatars are verified server-side after upload (≤2MB, jpg/png/webp, otherwise deleted). Export size (≤10MB) is not re-checked server-side; set a limit in the Cloudinary account/upload preset.
- Rate limits and the model pool are in-memory (single instance); the search cache is lost on restart.
- Public share links expose whatever the owner chose to share (verbatim ≤200-char answer excerpts appear in struggles).

## Local development environment (localhost)

See `docs/localhost-guide.md` for a full step-by-step to run this backend on `localhost` with a local Postgres: install Node 20 + Postgres (Docker or native), create `DATABASE_URL`, run `npx prisma db push`, `npm install`, `npm run dev`, and verify with `curl :8080/api/health`.

- **Key change**: the stack now uses a single `DATABASE_URL` (any Postgres) via Prisma — no `supabase/` folder, no `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`. Only `DATABASE_URL` points at your DB; the rest of the app is database-agnostic.
- **Postgres locally**: use Docker (`postgres:16-alpine`, `POSTGRES_DB=challenge_create`, port `5432`) or a native install; `sslmode=prefer` is fine for a local self-signed DB.
- **Build validation:** `npm run typecheck` and `npm run build`. The API also boots in `npm run dev` without NIM/Search/Email/Cloudinary credentials; only AI-dependent routes return 503 until those are configured.
- `/api/auth/signup` reveals whether an email is already registered (`EMAIL_TAKEN`).
