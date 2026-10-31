// Run only the Playwright specs a change can affect, on all three projects.
// The browser gate before a push (audit #21, option 1): docker-e2e only runs
// after code reaches main or an opt-in branch, 40+ minutes later.
//
//   npm run e2e:affected                    # changes vs origin/main + working tree
//   npm run e2e:affected -- --base=HEAD~3   # another base
//   npm run e2e:affected -- --dry-run       # list the specs, run nothing
//   npm run e2e:affected -- --dry-run --base=X~1 --head=X   # what commit X maps to
//   npm run e2e:affected -- --project=desktop-chromium
//   npm run e2e:affected -- --no-build      # build/ is already from this tree
//
// Mapping: a changed path yields tokens (its route dir, or the words of its
// lib path); a spec runs when a word of its file name matches a token. Shared
// shell files (layout, nav, i18n runtime, configs) add the smoke specs. A
// changed spec always runs. Heuristic by design: it is a fast pre-push check,
// docker-e2e stays the full gate.
import { execFileSync, spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';

const args = process.argv.slice(2);
const flag = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1];
const base = flag('base') ?? 'origin/main';
const head = flag('head') ?? 'HEAD';
const dryRun = args.includes('--dry-run');
const projects = args.filter((a) => a.startsWith('--project=')).map((a) => a.split('=')[1]);
const PROJECTS = projects.length
  ? projects
  : ['desktop-chromium', 'mobile-chromium', 'mobile-landscape-chromium'];

const git = (...a) => execFileSync('git', a, { encoding: 'utf8' }).split('\n').filter(Boolean);
const changed = [
  ...new Set([
    ...git('diff', '--name-only', `${base}...${head}`),
    // The working tree only counts when checking the checked-out commit.
    ...(head === 'HEAD'
      ? [...git('diff', '--name-only'), ...git('diff', '--name-only', '--cached')]
      : []),
  ]),
];

const SPEC_DIR = 'tests/e2e';
const specs = readdirSync(SPEC_DIR).filter((f) => f.endsWith('.spec.ts'));
const SMOKE = ['smoke.spec.ts', 'landing.spec.ts'].filter((s) => specs.includes(s));

// Words too generic to pick a spec on their own.
const STOP = new Set(
  'lib src routes components page layout svelte ts js mjs json test index data scene panel host types utils helpers config constants mobile build static images the a of'.split(
    ' ',
  ),
);
// Lib areas whose spec names don't share their word.
const ALIASES = {
  'surface-scene': ['surface', 'moon', 'mars', 'earth', 'venus'],
  'surface-map': ['surface', 'moon', 'mars'],
  station: ['iss', 'tiangong', 'station'],
  orbital: ['fly'],
  physics: ['fly', 'lab', 'plan'],
  universe: ['explore'],
  ar: ['explore'],
  audio: ['audio', 'tour'],
  paraglide: ['i18n', 'locale'],
  anatomy: ['fleet'],
  exploded: ['fleet'],
  offline: ['pwa'],
};
// Files every route renders through.
const SHARED =
  /^(src\/app\.(html|css)|src\/routes\/\+layout\.|src\/lib\/components\/(Nav|DebugPanel|Panel)\b|src\/lib\/i18n|src\/hooks|svelte\.config|vite\.config|playwright\.config|package(-lock)?\.json|tests\/e2e\/_helpers\/)/;

const tokens = new Set();
const picked = new Set();
let shared = false;
for (const path of changed) {
  // A changed spec, or a changed baseline in <spec>.spec.ts-snapshots/.
  const spec = path.match(/^tests\/e2e\/([^/]+\.spec\.ts)(?:-snapshots\/|$)/)?.[1];
  if (spec) {
    if (specs.includes(spec)) picked.add(spec);
    continue;
  }
  if (SHARED.test(path)) shared = true;
  const route = path.match(/^src\/routes\/([^/+]+)\//)?.[1];
  if (route) tokens.add(route);
  if (path.startsWith('src/lib/') || path.startsWith('static/') || path.startsWith('i18n-src/')) {
    const words = path
      .replace(/^(src\/lib|static\/(data|images)|static|i18n-src\/[^/]+)\//, '')
      .split(/[/._-]+/)
      .map((w) => w.toLowerCase());
    for (const w of words) if (w.length > 2 && !STOP.has(w)) tokens.add(w);
    for (const [area, alias] of Object.entries(ALIASES)) {
      if (path.includes(`/${area}/`) || path.includes(`/${area}-`))
        alias.forEach((a) => tokens.add(a));
    }
  }
}
for (const spec of specs) {
  const words = spec.replace(/\.spec\.ts$/, '').split('-');
  if (words.some((w) => tokens.has(w))) picked.add(spec);
}
if (shared) SMOKE.forEach((s) => picked.add(s));

const list = [...picked].sort();
console.log(
  `e2e-affected: ${changed.length} changed file(s) vs ${base}; ${list.length} spec(s); projects: ${PROJECTS.join(', ')}`,
);
for (const s of list) console.log(`  ${s}`);
if (!list.length) {
  console.log('e2e-affected: no spec maps to these changes — nothing to run.');
  process.exit(0);
}
if (dryRun) process.exit(0);

// Playwright serves build/ through vite preview, so a stale build tests old
// code. --no-build skips this when build/ was just made from this tree.
if (!args.includes('--no-build')) {
  const b = spawnSync('npm', ['run', 'build'], { stdio: 'inherit' });
  if (b.status !== 0) process.exit(b.status ?? 1);
}

const r = spawnSync(
  'npx',
  [
    'playwright',
    'test',
    '--workers=1',
    ...PROJECTS.map((p) => `--project=${p}`),
    ...list.map((s) => `${SPEC_DIR}/${s}`),
  ],
  { stdio: 'inherit' },
);
process.exit(r.status ?? 1);
