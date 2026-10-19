// For one commit + locale: every changed string field -> the changed sentence(s) old/new, plus the English field.
import { execSync } from 'node:child_process';
import fs from 'node:fs';
const [c, loc, out] = process.argv.slice(2);
const files = execSync(`git show --name-only --format= ${c}`)
  .toString()
  .trim()
  .split('\n')
  .filter(
    (f) =>
      f.endsWith('.json') && (f.startsWith(`i18n-src/${loc}/`) || f === `messages/${loc}.json`),
  );
const flat = (v, at, o) => {
  if (typeof v === 'string') o[at] = v;
  else if (v && typeof v === 'object')
    for (const [k, x] of Object.entries(v)) flat(x, at ? `${at}.${k}` : k, o);
  return o;
};
const show = (rev, f) => {
  try {
    return JSON.parse(execSync(`git show ${rev}:${f}`, { maxBuffer: 1e8 }).toString());
  } catch {
    return {};
  }
};
const split = (s) => s.split(/(?<=[.!?…])\s+/);
const rows = [];
for (const f of files) {
  const a = flat(show(`${c}~1`, f), '', {}),
    b = flat(show(c, f), '', {});
  const rel = f.startsWith('messages/') ? 'messages' : f.slice(`i18n-src/${loc}/`.length);
  for (const [k, v] of Object.entries(b)) {
    if (a[k] === v || a[k] === undefined) continue;
    const os = new Set(split(a[k]));
    const ns = split(v).filter((s) => !os.has(s));
    rows.push({ rel, at: k, new: ns.join(' ') });
  }
}
fs.writeFileSync(out, rows.map((r, i) => `${i + 1}\t${r.rel}:${r.at}\t${r.new}`).join('\n'));
console.log(
  loc,
  rows.length,
  'fields',
  rows.reduce((n, r) => n + r.new.length, 0),
  'chars',
);
