// Repair for the audit (rocket-body-audit.mjs): in ja / zh-CN / ko strings a body pass
// edited, list each bare "Saturn"/"Titan" of the pre-pass English with its context and
// an index; with --restore=<file> (lines "<file>\t<at>\t<idx,idx…>"), put the English
// rocket name back at exactly those occurrences, leaving planet/moon ones native.
//   node scripts/i18n-tools/rocket-body-restore.mjs <commit…> [--restore=<map.tsv>] [--write]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { writeJsonEdits } from '../lib/json-surgical.mjs';

const args = process.argv.slice(2);
const commits = args.filter((a) => !a.startsWith('--'));
const restoreFile = args.find((a) => a.startsWith('--restore='))?.slice(10);
const write = args.includes('--write');
const NAT = {
  Saturn: { ja: '土星', 'zh-CN': '土星', ko: '토성' },
  Titan: { ja: 'タイタン', 'zh-CN': '土卫六', ko: '타이탄' },
};
const BARE = /\b(Saturn|Titan)\b(?! ?(V|IB|I|1B|5|II|III|IV|GLV|23)\b)/g;
const restore = new Map(
  (restoreFile ? fs.readFileSync(restoreFile, 'utf8').trim().split('\n') : []).map((l) => {
    const [f, at, idx] = l.split('\t');
    return [`${f}\t${at}`, new Set(idx.split(',').map(Number))];
  }),
);
const get = (o, at) => at.split('.').reduce((a, k) => a?.[/^\d+$/.test(k) ? +k : k], o);
const seen = new Set();
for (const c of commits) {
  const files = execFileSync('git', ['show', '--name-only', '--format=', c], { encoding: 'utf8' })
    .split('\n')
    .filter((f) => /^i18n-src\/(ja|zh-CN|ko)\//.test(f));
  for (const f of files) {
    const loc = f.split('/')[1];
    const before = JSON.parse(execFileSync('git', ['show', `${c}~1:${f}`], { encoding: 'utf8' }));
    const edits = [];
    const visit = (a, at) => {
      if (typeof a === 'string') {
        const key = `${f}\t${at}`;
        if (seen.has(key)) return;
        const occ = [...a.matchAll(BARE)];
        if (!occ.length) return;
        const cur = get(JSON.parse(fs.readFileSync(f, 'utf8')), at);
        if (typeof cur !== 'string' || cur === a) return;
        seen.add(key);
        if (!restore.size) {
          console.log(key);
          occ.forEach((m, i) =>
            console.log(`  [${i}] ${m[0]}: …${a.slice(Math.max(0, m.index - 22), m.index + 30)}…`),
          );
          return;
        }
        const pick = restore.get(key);
        if (!pick) return;
        // walk the current string's native occurrences in order; English occurrence i is the
        // i-th native occurrence of that body that was NOT already native before the pass
        let nu = cur;
        for (const body of ['Saturn', 'Titan']) {
          const nat = NAT[body][loc];
          const preNative = (a.match(new RegExp(nat, 'g')) || []).length;
          const engIdx = occ.map((m, i) => (m[1] === body ? i : -1)).filter((i) => i >= 0);
          if (!engIdx.length) continue;
          // native positions in order, merged with pre-existing ones by position in `a`
          const order = [
            ...[...a.matchAll(new RegExp(nat, 'g'))].map((m) => ({ pos: m.index, eng: -1 })),
            ...engIdx.map((i) => ({ pos: occ[i].index, eng: i })),
          ].sort((x, y) => x.pos - y.pos);
          let k = -1;
          nu = nu.replace(new RegExp(nat, 'g'), (m) => {
            k += 1;
            const item = order[k];
            return item && item.eng >= 0 && pick.has(item.eng) ? (loc === 'ko' ? body : body) : m;
          });
          void preNative;
        }
        if (nu !== cur) edits.push({ at, old: cur, nu });
        console.log(`${key}\n  → ${nu.slice(0, 160)}`);
        return;
      }
      if (Array.isArray(a)) a.forEach((x, i) => visit(x, at ? `${at}.${i}` : `${i}`));
      else if (a && typeof a === 'object')
        for (const [k, x] of Object.entries(a)) visit(x, at ? `${at}.${k}` : k);
    };
    visit(before, '');
    if (write && edits.length) writeJsonEdits(f, edits);
  }
}
