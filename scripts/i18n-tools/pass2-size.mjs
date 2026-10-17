// Pass 2 sizing: per locale, how many times the body text (every overlay string that is
// not a page `name`) still writes a glossary term in English where the locale's glossary
// form differs — by class (body, feature, place, station). Vehicle names inside the term
// are protected the same way bodies-apply.mjs protects them.
//   node scripts/i18n-tools/pass2-size.mjs
import fs from 'node:fs';
import path from 'node:path';

const g = JSON.parse(fs.readFileSync('scripts/i18n-tools/native-terms.json', 'utf8'));
const CLASSES = ['body', 'feature', 'place', 'station'];
const L = ['ru', 'ja', 'zh-CN', 'ko', 'hi', 'ar', 'sr-Cyrl', 'de', 'fr', 'es', 'it', 'nl', 'pt-BR'];
const VEH =
  /\b(Saturn ?(V|IB|I|1B|5)\b|Blue Moon|[Tt]rans-[A-Z][a-z]+|Mars ?(Express|Pathfinder|Global|Reconnaissance|Odyssey|Climate|Polar|Observer|Science|Orbiter|Sample|Exploration|Atmosphere|Relay|Oxygen|Organic|Z-2|Hope|[0-9](?![.,0-9])|-[0-9])|Mercury[- ](Magnetospher|Atlas|Redstone|Seven|program|capsule|Mark|Transfer|Planetary|[0-9](?![.,0-9]))|Atlas-Mercury|Project Mercury|Pioneer Venus|Venus ?(Express|Climate)|Jupiter ?(Icy|C\b|-C|IRBM|Trojan)|Europa ?(Clipper|Lander|rocket)|Pluto ?(Kuiper|Express)|Moon ?(Mineralogy|Express|Impact)|Titan ?(II|III|IV|I\b|GLV|23|rocket)|Earth ?(Observing|Return)|Near-Earth|Sub-Earth|Phobos[ -][0-9]|Sun[–-]Earth|Earth[–-]Moon|Kennedy Space Center|Cape Canaveral Space Force)/g;
const SKIP_KEY = /(^|\.)(l|u|url|href|src|id|slug|t|key|wikidata|name|short_name)$/;
const walk = (d) =>
  fs.readdirSync(d).flatMap((n) => {
    const p = path.join(d, n);
    return fs.statSync(p).isDirectory() ? walk(p) : p.endsWith('.json') ? [p] : [];
  });
const total = {};
for (const loc of L) {
  const c = Object.fromEntries(CLASSES.map((k) => [k, 0]));
  for (const f of walk(`i18n-src/${loc}`)) {
    const visit = (v, at) => {
      if (typeof v === 'string') {
        if (SKIP_KEY.test(at) || /^(https?:|\/)/.test(v)) return;
        const s = v.replace(VEH, ' ');
        for (const cls of CLASSES)
          for (const [en, forms] of Object.entries(g[cls] ?? {})) {
            if (!forms[loc] || forms[loc] === en) continue;
            if (cls === 'body' && en === 'Mercury' && !/planet/i.test(f)) continue;
            c[cls] += (
              s.match(new RegExp(`\\b${en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')) || []
            ).length;
          }
        return;
      }
      if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${at}.${i}`));
      else if (v && typeof v === 'object')
        for (const [k, x] of Object.entries(v)) visit(x, at ? `${at}.${k}` : k);
    };
    visit(JSON.parse(fs.readFileSync(f, 'utf8')), '');
  }
  total[loc] = c;
  console.log(
    loc,
    JSON.stringify(c),
    Object.values(c).reduce((a, b) => a + b, 0),
  );
}
