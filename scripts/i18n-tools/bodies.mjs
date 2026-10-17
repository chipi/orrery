import fs from 'node:fs';
import path from 'node:path';
const BODIES = [
  'Earth',
  'Moon',
  'Sun',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
  'Ceres',
  'Titan',
  'Europa',
  'Io',
  'Ganymede',
  'Callisto',
  'Enceladus',
  'Phobos',
  'Deimos',
  'Charon',
  'Triton',
  'Vesta',
  'Bennu',
  'Ryugu',
  'Itokawa',
  'Arrokoth',
  'Eris',
  'Sedna',
  'Halley',
];
// Vehicle/program names that contain a body name (they keep the origin rule).
const VEH =
  /\b(Saturn ?(V|IB|I|1B|5)\b|Mars ?(Express|Pathfinder|Global|Reconnaissance|Odyssey|Climate|Polar|Observer|Science|Orbiter|Sample|Exploration|Atmosphere|Cube|One|Society|Direct|Base|Ascent|Helicopter|Hope|[0-9]|-[0-9])|Mercury[- ](Atlas|Redstone|Seven|program|capsule|[0-9]|MESSENGER)|Venus ?(Express|Climate)|Jupiter ?(Icy|C\b|-C|IRBM)|Europa ?(Clipper|Lander)|Pluto ?(Kuiper|Express)|Moon ?(Mineralogy|Express)|Sun ?(Synchronous)|Titan ?(II|III|IV|I\b|GLV|23)|Juno|Earth ?(Observing|Return)|Lunar)/;
const loc = process.argv[2];
const out = {};
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
for (const f of walk(`i18n-src/${loc}`)) {
  const strs = fs.readFileSync(f, 'utf8').match(/"(?:[^"\\]|\\.)*"/g) || [];
  for (const s of strs) {
    if (/^"(https?:|\/|[a-z0-9_-]+")/.test(s)) continue;
    const clean = s.replace(new RegExp(VEH.source, 'g'), ' ');
    for (const b of BODIES)
      for (const m of clean.matchAll(new RegExp(`.{0,25}\\b${b}\\b.{0,20}`, 'g')))
        (out[b] ??= []).push(`${f.slice(9 + loc.length)} | ${m[0]}`);
  }
}
const n = Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.length]));
console.log(loc, JSON.stringify(n));
if (process.argv[3])
  fs.writeFileSync(
    process.argv[3],
    Object.entries(out)
      .flatMap(([k, v]) => v.map((x) => `${k}\t${x}`))
      .join('\n') + '\n',
  );
