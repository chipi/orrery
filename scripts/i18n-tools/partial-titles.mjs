import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { designations, knownNamesIn } from '../lib/translate-quality.mjs';
const walk = (d) =>
  readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const NONLATIN = ['ru', 'ja', 'ko', 'zh-CN', 'hi', 'ar', 'sr-Cyrl'];
for (const loc of NONLATIN)
  for (const f of walk(`i18n-src/${loc}/science`)) {
    const rel = f.slice(`i18n-src/${loc}/`.length);
    let en;
    try {
      en = JSON.parse(readFileSync(`i18n-src/en-US/${rel}`, 'utf8')).title;
    } catch {
      continue;
    }
    const t = JSON.parse(readFileSync(f, 'utf8')).title;
    if (!t || t === en) continue;
    let rest = t;
    for (const n of [...knownNamesIn(en), ...designations(en)]) rest = rest.split(n).join(' ');
    const words = (rest.match(/\b[A-Za-z][A-Za-z-]{3,}\b/g) || []).filter((w) =>
      new RegExp(`\\b${w}\\b`).test(en),
    );
    if (words.length) console.log(`${loc}\t${rel}\t${t}\t[${words.join(',')}]`);
  }
