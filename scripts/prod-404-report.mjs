/**
 * Prod 404 report — what readers and crawlers asked for that the site did not
 * have, from the orrery-web nginx access log in VictoriaLogs.
 *
 * Every distinct path that answered 404 on a site path in the window is
 * listed with hits, first/last seen, a referrer, who asked, and what it
 * returns NOW (each is re-requested from the live site), sorted so the ones
 * to fix come first:
 *   our-link  — the referrer is a page of this site: we link to it
 *   reader    — a browser without a crawler signature
 *   crawler   — a bot (UA says bot/crawler/spider …)
 *   probe     — our own checks (validate-prod's deliberate 404s)
 *   old-build — /_app/immutable/ files of a previous deploy, asked for by a
 *               tab that was open across a deploy (accepted, 2026-11-01)
 * Scanner noise on paths the site never serves (wp-admin, .env, *.php …) is
 * counted, not listed.
 *
 * Needs the tailnet (VictoriaLogs). Read-only.
 *
 * Usage: node scripts/prod-404-report.mjs [--days=7] [--top=80] [--no-recheck] [--md=path]
 */
import { writeFileSync } from 'node:fs';

const VL = process.env.VL_URL ?? 'https://vlogs.tail6d0ed4.ts.net';
const SITE = process.env.SITE_URL ?? 'https://www.orrerylearn.com';
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const days = Number(args.days ?? 7);
const top = Number(args.top ?? 80);

const LOCALES = 'ar|de|es|fr|hi|it|ja|ko|nl|pt-BR|ru|sr-Cyrl|zh-CN';
// Paths this site can serve; anything else that 404s is scanner noise.
const SITE_PATH = new RegExp(
  `^/(_app|data|images|audio|textures|logos|fonts|models|favicon|manifest|apple-touch|robots\\.txt|sitemap|sw\\.js|offline|\\.well-known/traffic-advice|about|(${LOCALES})(/|$)|(explore|worlds|catalog|learn|missions|fleet|plan|fly|earth|moon|mars|venus|iss|tiangong|science|essays|programs|lab|live|library|gallery|posters|patches|sourcing|credits|colophon|privacy|cards|c)(/|$|\\?))`,
);
const PROBE = /zzz/; // validate-prod.mjs asks for /missions/zzz-nope and /zzz-not-a-page
// Our own tools: this report's re-check (Node fetch) and the link checkers.
const OWN_UA = /^node$|Orrery-LinkChecker/;
const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|preview|monitor|curl|python|go-http|headless/i;
const LINE = /\[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d{3}) \S+ "([^"]*)" "([^"]*)"/;

async function fetchLines() {
  const q = `_time:${days}d container:orrery-web " 404 "`;
  const res = await fetch(
    `${VL}/select/logsql/query?${new URLSearchParams({ query: q, limit: '100000' })}`,
  );
  if (!res.ok) throw new Error(`VictoriaLogs ${res.status}: ${await res.text()}`);
  return (await res.text())
    .split('\n')
    .filter(Boolean)
    .map((l) => JSON.parse(l)._msg);
}

function classify(path, ref, ua) {
  if (PROBE.test(path) || OWN_UA.test(ua)) return 'probe';
  if (path.startsWith('/_app/immutable/')) return 'old-build';
  const bot = BOT.test(ua);
  // Scanners send the URL they ask for as its own referrer; that is not a link.
  const refPath = ref.replace(/^https?:\/\/(www\.)?orrerylearn\.com/, '');
  const fromOurPage = refPath !== ref && refPath.replace(/\?.*$/, '') !== path;
  if (fromOurPage && !bot) return 'our-link';
  return bot ? 'crawler' : 'reader';
}
const ORDER = ['our-link', 'reader', 'crawler', 'probe', 'old-build'];

async function statusNow(path) {
  try {
    const res = await fetch(SITE + path, {
      method: 'HEAD',
      redirect: 'manual',
      headers: { 'user-agent': 'Orrery-LinkChecker/1.0 (prod-404-report recheck)' },
    });
    const loc = res.headers.get('location');
    return loc ? `${res.status} → ${loc}` : String(res.status);
  } catch (e) {
    return `error ${e.cause?.code ?? e.message}`;
  }
}

const lines = await fetchLines();
const rows = new Map();
let scanner = 0;
for (const l of lines) {
  const m = l.match(LINE);
  if (!m || m[4] !== '404') continue;
  const [, time, , rawPath, , ref, ua] = m;
  const path = rawPath.replace(/\?.*$/, '');
  if (!SITE_PATH.test(path)) {
    scanner++;
    continue;
  }
  const cls = classify(path, ref === '-' ? '' : ref, ua);
  const r = rows.get(path) ?? {
    path,
    hits: 0,
    classes: new Set(),
    refs: new Set(),
    uas: new Set(),
    first: time,
    last: time,
  };
  r.hits++;
  r.classes.add(cls);
  if (ref && ref !== '-') r.refs.add(ref);
  r.uas.add(ua.replace(/^Mozilla\/5\.0 /, '').slice(0, 50));
  r.first = time < r.first ? time : r.first; // log lines arrive newest first
  r.last = time > r.last ? time : r.last;
  rows.set(path, r);
}
// Worst class per path decides where it sorts.
const list = [...rows.values()].map((r) => ({
  ...r,
  cls: ORDER.find((c) => r.classes.has(c)),
}));
list.sort((a, b) => ORDER.indexOf(a.cls) - ORDER.indexOf(b.cls) || b.hits - a.hits);

const shown = list.filter((r) => r.cls !== 'old-build').slice(0, top);
if (!args['no-recheck']) for (const r of shown) r.now = await statusNow(r.path);

const count = (c) => list.filter((r) => r.cls === c).reduce((n, r) => n + r.hits, 0);
const summary = ORDER.map((c) => `${c} ${count(c)}`).join(' · ');
const out = [];
out.push(`# Prod 404s — last ${days} days (${new Date().toISOString().slice(0, 10)})`, '');
out.push(
  `${lines.length} 404 lines; ${list.length} distinct site paths; scanner noise ${scanner} lines.`,
  '',
);
out.push(`Hits by class: ${summary}`, '');
out.push(
  '| Class | Hits | Path | Now | Referrer | Asked by | Last seen |',
  '| --- | ---: | --- | --- | --- | --- | --- |',
);
for (const r of shown)
  out.push(
    `| ${r.cls} | ${r.hits} | ${r.path} | ${r.now ?? ''} | ${[...r.refs][0] ?? ''} | ${[...r.uas][0] ?? ''} | ${r.last} |`,
  );
const oldBuild = list.filter((r) => r.cls === 'old-build');
out.push(
  '',
  `Old-build script files (accepted): ${oldBuild.length} paths, ${count('old-build')} hits.`,
);
const md = out.join('\n');
if (args.md) writeFileSync(args.md, md);
console.log(md);
