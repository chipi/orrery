// Print N random (en-US, locale) prose pairs from an overlay tree, seeded, for a hand-read
// quality sample (0.9.6 "measure first" rounds).
//   node scripts/i18n-tools/sample-pair.mjs <locale> <tree> [n=6] [seed=7]
import { readFileSync, readdirSync, existsSync } from 'node:fs';
const [loc, tree, n = '6', seed = '7'] = process.argv.slice(2);
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(`${d}/${e.name}`) : e.name.endsWith('.json') ? [`${d}/${e.name}`] : [],
  );
const pairs = [];
const visit = (e, t, at, f) => {
  if (typeof e === 'string' && typeof t === 'string') {
    if (e.length > 120 && e.length < 420) pairs.push({ f, at, e, t });
  } else if (e && t && typeof e === 'object')
    for (const k of Object.keys(e)) visit(e[k], t[k], `${at}.${k}`, f);
};
for (const f of walk(`i18n-src/en-US/${tree}`)) {
  const tf = f.replace('/en-US/', `/${loc}/`);
  if (existsSync(tf))
    visit(
      JSON.parse(readFileSync(f, 'utf8')),
      JSON.parse(readFileSync(tf, 'utf8')),
      '',
      f.slice('i18n-src/en-US/'.length),
    );
}
let s = +seed;
const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
for (let i = 0; i < +n; i++) {
  const p = pairs.splice(Math.floor(rnd() * pairs.length), 1)[0];
  console.log(`\n## ${p.f} ${p.at}\nEN: ${p.e}\n${loc}: ${p.t}`);
}
