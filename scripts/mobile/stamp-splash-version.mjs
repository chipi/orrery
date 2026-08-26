// Stamp the native launch splash with the exact build tag so mobile builds are
// distinguishable at a glance (#51 follow-up — chasing a stale build wasted a
// round). Rewrites the VERS-lb-001 label in LaunchScreen.storyboard to
// `v<major.minor> · <MM-DD HH:MM>` at build time. Runs in `build:mobile`.
//
// The storyboard is native (shown before the web layer loads), so this is the
// earliest possible build marker — visible on the splash the instant the app
// opens, before any navigation. The dynamic package version still drives the
// in-app footer; this is the coarse "which build am I running" stamp.
import { readFileSync, writeFileSync } from 'node:fs';

const SB = 'ios/App/App/Base.lproj/LaunchScreen.storyboard';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
// 0.8.0 → 0.8 ; 0.8.1 → 0.8.1 ; keep any pre-release suffix.
const [core, ...pre] = String(pkg.version).split('-');
const [maj, min, patch] = core.split('.');
const base = patch === '0' ? `${maj}.${min}` : `${maj}.${min}.${patch}`;
const version = pre.length ? `${base}-${pre.join('-')}` : base;

// Use the shared BUILD_TAG env so the splash matches the in-app menu exactly;
// fall back to the local build time (UTC, matching the vite define's format).
const stamp =
  process.env.BUILD_TAG || new Date().toISOString().slice(5, 16).replace('T', ' ');
const tag = `v${version} · ${stamp}`;

let sb = readFileSync(SB, 'utf8');
const re = /(text=")[^"]*("[^>]*\bid="VERS-lb-001")/;
if (!re.test(sb)) {
  console.error('[stamp-splash] ✗ VERS-lb-001 label not found in the storyboard');
  process.exit(1);
}
sb = sb.replace(re, `$1${tag}$2`);
writeFileSync(SB, sb);
console.log(`[stamp-splash] ${tag}`);
