// Audit: strings a body-name pass changed where the English held a bare "Saturn" or
// "Titan" that names the ROCKET family, not the planet/moon. Prints old → current per
// string so each is restored by hand. Reads the commits' diffs from git.
//   node scripts/i18n-tools/rocket-body-audit.mjs <commit> [<commit>…]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const commits = process.argv.slice(2);
// rocket words in the text around the name (en + the edited locales)
const ROCKET =
  /rocket|launch|engine|booster|stage|era|family|ロケット|エンジン|発射|打ち上げ|時代|火箭|发动机|发射|运载|时代|로켓|엔진|발사|시대|razz|motor|fusée|cohete|foguete|Rakete|raket|Triebwerk/i;
const PLANET_PATH =
  /(^|\/)(planets|satellites|belts|orbit-regimes[^/]*|science\/planets|small-bodies)\/|cassini|huygens|voyager|dragonfly|pioneer-11|juno/;
for (const c of commits) {
  const files = execFileSync('git', ['show', '--name-only', '--format=', c], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /^i18n-src\/(ja|zh-CN|ko)\//.test(f));
  for (const f of files) {
    const before = JSON.parse(execFileSync('git', ['show', `${c}~1:${f}`], { encoding: 'utf8' }));
    const now = fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {};
    const visit = (a, b, at) => {
      if (typeof a === 'string') {
        if (!/\b(Saturn|Titan)\b(?! ?(V|IB|I|1B|5|II|III|IV|GLV|23)\b)/.test(a)) return;
        const rocket =
          !PLANET_PATH.test(f) ||
          ROCKET.test(a.match(/.{0,25}\b(Saturn|Titan)\b.{0,25}/)?.[0] ?? '');
        if (rocket && a !== b)
          console.log(`${f}\t${at}\n  was: ${a.slice(0, 220)}\n  now: ${String(b).slice(0, 220)}`);
        return;
      }
      if (Array.isArray(a)) a.forEach((x, i) => visit(x, b?.[i], at ? `${at}.${i}` : `${i}`));
      else if (a && typeof a === 'object')
        for (const [k, x] of Object.entries(a)) visit(x, b?.[k], at ? `${at}.${k}` : k);
    };
    visit(before, now, '');
  }
}
