// Bundle report: node scripts/report-bundle.mjs   (run after `vite build`; `npm run build:report` also writes dist/stats.html)
// Prints the real gzip size of the INITIAL load and fails if it breaks the budget or contains lazy-only libraries.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { join } from 'node:path';

const DIST = 'dist';
const BUDGET_KB = 180;
// Route chunks that load immediately on the first screen (the Gate lives at "/").
const INITIAL_ROUTE_CHUNKS = (process.env.INITIAL_ROUTE_CHUNKS ?? 'Gate').split(',').map((s) => s.trim()).filter(Boolean);
const FORBIDDEN = [/jsPDF|jspdf/, /html-to-image/, /xyflow|react-flow|@xyflow/, /dagre/];
const FORBIDDEN_CHUNK_NAMES = [/^vendor-flow/, /^vendor-export/];

if (!existsSync(join(DIST, 'index.html'))) {
  console.error('dist/index.html not found - run `npm run build` first.');
  process.exit(2);
}
const html = readFileSync(join(DIST, 'index.html'), 'utf8');
const assets = readdirSync(join(DIST, 'assets'));
const read = (f) => readFileSync(join(DIST, 'assets', f));
const gz = (buf) => gzipSync(buf, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1);

const entry = /<script[^>]+type="module"[^>]+src="\/assets\/([^"]+\.js)"/.exec(html)?.[1];
if (!entry) {
  console.error('Could not find the entry script in dist/index.html');
  process.exit(2);
}

// Follow STATIC imports only (from"./x.js" / import"./x.js"); dynamic import("./x.js") is lazy.
const staticImports = (file) => {
  const src = read(file).toString('utf8');
  return [...src.matchAll(/(?:from|import)\s*"\.\/([^"]+\.js)"/g)].map((m) => m[1]);
};
const initial = new Set();
const walk = (f) => {
  if (initial.has(f) || !assets.includes(f)) return;
  initial.add(f);
  staticImports(f).forEach(walk);
};
walk(entry);
for (const name of INITIAL_ROUTE_CHUNKS) {
  const chunk = assets.find((a) => a.startsWith(`${name}-`) && a.endsWith('.js'));
  if (chunk) walk(chunk);
  else console.warn(`(no chunk named ${name}-*.js found yet - it may not exist before the screen is built)`);
}

const rows = (files) =>
  [...files].map((f) => ({ f, raw: read(f).length, gz: gz(read(f)) })).sort((a, b) => b.gz - a.gz);
const initialRows = rows(initial);
const totalGz = initialRows.reduce((s, r) => s + r.gz, 0);
const css = assets.filter((a) => a.endsWith('.css')).map((f) => ({ f, gz: gz(read(f)) }));

console.log('\nINITIAL JS (entry + static imports + first-screen route chunks)');
for (const r of initialRows) console.log(`  ${r.f.padEnd(44)} ${kb(r.raw).padStart(8)} KB raw  ${kb(r.gz).padStart(7)} KB gzip`);
console.log(`  ${'TOTAL'.padEnd(44)} ${' '.repeat(8)}     ${kb(totalGz).padStart(7)} KB gzip   (budget ${BUDGET_KB} KB)`);
console.log(`\nCSS: ${css.map((c) => `${c.f} ${kb(c.gz)} KB gzip`).join(', ') || 'none'}`);

console.log('\nLAZY CHUNKS (not loaded up front)');
for (const r of rows(assets.filter((a) => a.endsWith('.js') && !initial.has(a)))) {
  console.log(`  ${r.f.padEnd(44)} ${kb(r.gz).padStart(7)} KB gzip`);
}

let ok = true;
if (totalGz / 1024 > BUDGET_KB) {
  ok = false;
  console.error(`\nFAIL: initial JS is ${kb(totalGz)} KB gzip (> ${BUDGET_KB} KB)`);
}
for (const r of initialRows) {
  if (FORBIDDEN_CHUNK_NAMES.some((re) => re.test(r.f))) {
    ok = false;
    console.error(`FAIL: lazy-only chunk ${r.f} is in the initial load`);
  }
  const text = read(r.f).toString('utf8');
  for (const re of FORBIDDEN) {
    if (re.test(text)) {
      ok = false;
      console.error(`FAIL: ${r.f} mentions ${re} (a lazy-only library leaked into the initial load)`);
    }
  }
}
console.log(ok ? '\nPASS: budget met, jspdf / html-to-image / xyflow / dagre are NOT in the initial bundle.\n' : '\nReport: FAILED\n');
process.exit(ok ? 0 : 1);
