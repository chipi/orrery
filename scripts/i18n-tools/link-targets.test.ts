import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Markdown links in translated overlays must keep the English targets. A machine
// translation wrote "[suiveurs étoiles] (phases de mission/suiveurs étoiles)" — the space
// and the translated path turn the link into text (fr/pt-BR dead-reckoning,
// star-trackers, space-photography; fixed 2026-10-31).
//  - every target of an English field is in the same translated field;
//  - a target the translation adds must be one the English file links somewhere
//    (a translator may link a mention the English leaves plain; never a new path).
const R = 'i18n-src';
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return statSync(p).isDirectory() ? walk(p) : n.endsWith('.json') ? [p] : [];
  });
function leaves(o: unknown, prefix = '', out: [string, string][] = []): [string, string][] {
  if (typeof o === 'string') out.push([prefix, o]);
  else if (o && typeof o === 'object')
    for (const [k, v] of Object.entries(o)) leaves(v, prefix ? `${prefix}.${k}` : k, out);
  return out;
}
const targets = (s: string) => [...s.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1]);

describe('i18n overlays keep the English link targets', () => {
  it('no translated field drops or invents a link target', () => {
    const problems: string[] = [];
    const locales = readdirSync(R).filter((l) => l !== 'en-US');
    for (const enFile of walk(path.join(R, 'en-US'))) {
      const rel = path.relative(path.join(R, 'en-US'), enFile);
      const enLeaves = leaves(JSON.parse(readFileSync(enFile, 'utf8')));
      const en = new Map(enLeaves);
      const fileTargets = new Set(enLeaves.flatMap(([, s]) => targets(s)));
      if (!fileTargets.size) continue;
      for (const loc of locales) {
        const f = path.join(R, loc, rel);
        if (!existsSync(f)) continue;
        for (const [at, tr] of leaves(JSON.parse(readFileSync(f, 'utf8')))) {
          const e = en.get(at);
          if (typeof e !== 'string') continue;
          const tt = targets(tr);
          for (const t of targets(e))
            if (!tt.includes(t)) problems.push(`${loc} ${rel} :: ${at} drops ${t}`);
          for (const t of tt)
            if (!fileTargets.has(t)) problems.push(`${loc} ${rel} :: ${at} adds ${t}`);
        }
      }
    }
    expect(problems, problems.slice(0, 30).join('\n')).toEqual([]);
  });
});
