# ChallengeX Client

Vite + React 18 + TypeScript + Tailwind CSS + framer-motion + Zustand + React Router. Every page is lazy-loaded.
Everything visual is CSS + SVG + canvas: **no image files ship**. Backend: see `../backend`.

```bash
cd client
npm install                 # creates package-lock.json (commit it: Render uses `npm ci`)
cp .env.example .env        # VITE_API_BASE_URL=http://localhost:8080
npm run dev                 # http://localhost:5173   (dev-only page: /dev/kitchen-sink)
npm run typecheck
npm run build
npm run build:report        # build + dist/stats.html (treemap) + the REAL initial-JS gzip size, with pass/fail
```

The backend's `FRONTEND_ORIGIN` must contain the client origin (CORS).

## File tree

```
client/
├─ index.html · vite.config.ts · tailwind.config.js · tsconfig.json · .env.example
├─ scripts/report-bundle.mjs        initial-JS report (gzip) + "lazy libs not in the initial bundle" check
├─ docs/CONTRAST.md                 colour-contrast table (WCAG AA)
└─ src/
   ├─ main.tsx · index.css · styles/scenes.css      tokens, glass, buttons, ALL keyframes (transform/opacity only)
   ├─ routes/        router.tsx (lazy routes + scene/circle handles) · Root.tsx (auth bootstrap, RequireAuth) · RouteError.tsx
   ├─ pages/         Gate · Realm · Altar · Trial · Verdict · Ideas · RoadmapIntake · RoadmapView · History · Profile · PublicShare · NotFound · KitchenSink
   ├─ lib/           api.ts (fetch wrapper) · endpoints.ts · apiTypes.ts · errors.ts · audio.ts (Web Audio synth) · trialLogic.ts · gauge.ts
   │                 roadmapLayout.ts (dagre) · exporter.ts (html-to-image + jspdf) · cloudinaryUpload.ts · ideasForm.ts · seo.ts · fixtures.ts …
   ├─ store/         authStore · prefsStore · sceneFxStore
   ├─ hooks/         useOnline · useMedia (+reduced motion) · useCountdown · useCountUp · useSequence · useHealthWake …
   └─ components/
      ├─ scenes/     art.tsx (primitives) · GateScene · ValleyScene · AltarScene · SceneBackdrop · MagicCircle(+Layer) · Embers · SmokeOverlay
      ├─ auth/ trial/ verdict/ ideas/ roadmap/ export/ profile/ shell/ ui/ art/
```

## Lazy loading (what is and isn't in the first load)

- Every page is a lazy route. `domAnimation` (framer) is loaded asynchronously by `<LazyMotion>`.
- `@xyflow/react` + `@dagrejs/dagre` → chunk `vendor-flow`, loaded only by `RoadmapCanvas` (Roadmap view, public roadmap share, kitchen sink).
- `html-to-image` + `jspdf` → chunk `vendor-export`, loaded only by `lib/exporter.ts` when the user presses Export.
- `scripts/report-bundle.mjs` counts as **initial**: entry + its static imports + the **Gate** route chunk (the first screen), and FAILS if the total is > 180 KB gzip or if a `vendor-flow` / `vendor-export` chunk (or the strings jsPDF / html-to-image / xyflow / dagre) appear in it.

## Build notes

Run `npm run typecheck` and `npm run build` before deployment. `npm run build:report` creates a bundle report and checks the initial JavaScript size. Verify the gate and roadmap at mobile, tablet, and desktop widths before release.

## Behaviour notes

- **Retries:** the API client retries once on a network error for GET and for idempotent POSTs (`next`, `answer`, `verdict`, `save`). Create-style POSTs (new trial, ideas, roadmap, share) are never auto-retried, to avoid duplicates; their screens show a Retry button instead.
- **Auth:** token in `localStorage`; a 401 (or ACCOUNT_SUSPENDED) clears it and returns to the gate with a message. The server re-checks the user on every request, so a demoted/suspended user is cut off immediately.
- **Trial recovery:** the typed answer is only cleared after the server accepted it; `/answer` is idempotent per question; a failed `/next` retries without re-sending the answer; a dropped connection auto-retries when the browser comes back online; resuming a trial restores the pending question without duplicating it.
- **Verdict screen** forges for at least 3 s when the verdict is generated; opening an already-finished verdict skips the wait. The radar uses the server's penalty-applied `finalScore`; gauge/badge use the server's `totalScore`/`verdict` (the client never recomputes them).
- **Avatar:** pick a photo → it is downscaled to ≤ 1024 px → drag/zoom the square window (keyboard: arrows) → the crop rectangle (in the downscaled pixels) is sent to `/api/uploads/sign`, the server signs `c_crop` → 256×256 fill, the browser uploads straight to Cloudinary, `/api/profile/avatar` verifies and saves.
- **Export / Share:** the off-screen 1080×1350 branded card is rendered to a cover image, then a **complete multi-page PDF** is built (page 1 = the branded cover; the following pages carry _every_ generated detail — struggles, how-to-overcome fixes, alternative directions, the validation experiment, rivals, and for roadmaps every node's description, deliverables, difficulty notes and better paths). Only the single PDF is uploaded (one signature from `/api/uploads/sign`) and stored on the share. The public share page shows the same full detail: verdicts render the complete `VerdictView`, roadmaps render the graph **plus** a "Every step" details list. Cloudinary may block PDF delivery by default (see the backend README).
- **Gate:** "Skip intro" is available before and during the animation; "Always skip" is persisted (also in Profile). With always-skip and no login you land on the auth window; with a login you land on `/realm`. Reduced motion = red flash + crossfade. Audio is synthesized, created only on the click, never when muted, and wrapped in try/catch.
- **History:** deleting a roadmap record removes its history entry; the underlying roadmap row stays on the server (no delete endpoint for roadmaps).
- **Open Graph tags** on `/s/:slug` are set client-side, so link-preview bots (which do not run JavaScript) will not see them. A real fix needs a small server-rendered route.
- **CSP** lives in `../render.yaml` (headers cannot read env vars: replace `YOUR-API.onrender.com`).

## Release checks

- [ ] Gate: both modes ≈ 2.5 s, no jank; Skip + mute work; the next screen mounts under the smoke at ~2 s
- [ ] Realm → Altar: the circle glides to the dais; steps light one by one; crystal beam; panel appears (skippable)
- [ ] A full 7–15 question trial incl. skipping (warning on the 4th) and a network drop mid-answer (DevTools → Offline → back online)
- [ ] Verdict fixtures 39 / 40 / 69 / 70 in `/dev/kitchen-sink` match KILL / PIVOT / PIVOT / BUILD
- [ ] Export → share link opens logged-out at `/s/:slug`
- [ ] 24-node roadmap: pan/zoom with touch, filter by stage, alternate toggle, better-path highlight
- [ ] No horizontal scroll at 360 / 768 / 1440
