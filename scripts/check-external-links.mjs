/**
 * Outbound links a reader can click, all of them — status check + report.
 *
 * check-learn-links.ts covers the curated LEARN manifest (link-provenance.json,
 * ~1,200 URLs). The site shows many more: image credit source pages, video
 * sources, program and essay references, museum and observatory pages,
 * hard-coded links in components, and every <a href> in the prerendered HTML.
 * This collects them from where they live and probes each one.
 *
 * Collected from
 *   - build/**\/*.html <a href> (when a build exists; run after `npm run build`)
 *   - static/data/** — only top-level files/dirs the app's code reads (a name
 *     that appears in src/); generated i18n bundles skipped (i18n-src is read)
 *   - i18n-src/<locale>/**, messages/*.json, src/**\/*.{svelte,ts} (not tests)
 * Skipped: this site's own hosts, direct media/file URLs (images, audio,
 * models — the image pipeline owns those), XML namespaces, and SKIP_HOSTS.
 *
 * Results are cached in .cache/external-links.json; a URL checked within
 * --max-age days (default 7) is not re-probed. Report:
 * docs/provenance/external-link-check.md.
 *
 * Usage:
 *   node scripts/check-external-links.mjs                  # probe stale URLs, write report
 *   node scripts/check-external-links.mjs --max-age=0      # re-probe everything
 *   node scripts/check-external-links.mjs --list           # only print the collected set
 *   node scripts/check-external-links.mjs --limit=50       # probe at most 50 (smoke)
 *   node scripts/check-external-links.mjs --strict         # exit 1 on any dead link
 *   node scripts/check-external-links.mjs --recheck=dead,timeout   # re-probe those now
 */
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { probeAll } from './lib/link-probe.mjs';

const ROOT = process.cwd();
const CACHE = join(ROOT, '.cache/external-links.json');
const REPORT = join(ROOT, 'docs/provenance/external-link-check.md');
const MOVED = join(ROOT, '.cache/external-links-moved.md');

const OWN_HOSTS =
  /(^|\.)orrerylearn\.com$|^chipi\.github\.io$|^localhost$|^127\.0\.0\.1$|(^|\.)tail[0-9a-f]+\.ts\.net$/;
// Hosts not probed, each with the reason.
const SKIP_HOSTS = {
  // Launch Library 2 API: rate-limited (free tier), and launches.json's links to
  // it are rewritten from the API itself every 6 h by the data refresh.
  'll.thespacedevs.com': 'rate-limited API; links refreshed from it every 6 h',
  'www.w3.org': 'XML namespaces, not links',
  'example.com': 'placeholder',
};
const MEDIA =
  /\.(jpe?g|png|webp|avif|gif|tiff?|svg|ico|mp3|mp4|m4a|webm|ogg|wav|glb|gltf|zip|json|csv|txt)(\?.*)?$/i;
// Parentheses are allowed (Wikipedia titles have them); clean() drops an unbalanced
// trailing one, as in a markdown link [x](https://…).
const URL_RE = /https?:\/\/[^\s"'<>\]`\\{}|^]+/g;
// In JSON the string delimiter is ", so an apostrophe belongs to the URL (Commons
// titles like File:NASA's_…); in code it ends a '…' string.
const URL_IN_JSON_RE = /https?:\/\/[^\s"<>\]`\\{}|^]+/g;
const A_HREF_RE = /<a\b[^>]*?\bhref="(https?:\/\/[^"]+)"/g;

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=');
    return [k, v ?? true];
  }),
);
const maxAgeDays = args['max-age'] !== undefined ? Number(args['max-age']) : 7;

function walk(dir, keep) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p, keep));
    else if (keep(p)) out.push(p);
  }
  return out;
}

function clean(raw) {
  let u = raw.replace(/&amp;/g, '&').replace(/[.,;:!?'"]+$/, '');
  const count = (c) => u.split(c).length - 1;
  while (u.endsWith(')') && count(')') > count('(')) u = u.slice(0, -1).replace(/[.,;:!?'"]+$/, '');
  return u;
}

export function collect() {
  /** @type {Map<string, Set<string>>} url → files that hold it */
  const found = new Map();
  const add = (raw, file) => {
    const url = clean(raw);
    let host;
    try {
      host = new URL(url).hostname;
    } catch {
      return;
    }
    if (
      OWN_HOSTS.test(host) ||
      !host.includes('.') ||
      SKIP_HOSTS[host] ||
      (MEDIA.test(url) && !url.includes('/wiki/')) ||
      // A template string (`https://host/${id}`) stops at "{" and leaves "$";
      // "…" marks an elided example in a comment.
      url.endsWith('$') ||
      url.includes('…')
    )
      return;
    if (!found.has(url)) found.set(url, new Set());
    found.get(url).add(relative(ROOT, file));
  };

  const srcFiles = walk(
    join(ROOT, 'src'),
    // /dev/* tooling pages never ship; what only they read is not site data.
    (p) => /\.(svelte|ts)$/.test(p) && !/\.test\.ts$/.test(p) && !p.includes('/src/routes/dev/'),
  );
  const srcText = srcFiles.map((f) => readFileSync(f, 'utf8')).join('\n');

  // static/data entries the app reads; the rest are tooling records.
  const dataDir = join(ROOT, 'static/data');
  const read = readdirSync(dataDir).filter(
    (n) => n !== 'i18n' && srcText.includes(n.replace(/\.json$/, '')),
  );
  const dataFiles = read.flatMap((n) => {
    const p = join(dataDir, n);
    return statSync(p).isDirectory() ? walk(p, (f) => f.endsWith('.json')) : [p];
  });

  const textFiles = [
    ...dataFiles,
    ...walk(join(ROOT, 'i18n-src'), (p) => p.endsWith('.json')),
    ...walk(join(ROOT, 'messages'), (p) => p.endsWith('.json')),
    ...srcFiles,
  ];
  for (const f of textFiles)
    for (const m of readFileSync(f, 'utf8').matchAll(f.endsWith('.json') ? URL_IN_JSON_RE : URL_RE))
      add(m[0], f);

  const html = walk(join(ROOT, 'build'), (p) => p.endsWith('.html') && !p.includes('/_app/'));
  for (const f of html) for (const m of readFileSync(f, 'utf8').matchAll(A_HREF_RE)) add(m[1], f);

  return { found, sources: { data: dataFiles.length, text: textFiles.length, html: html.length } };
}

function loadCache() {
  try {
    return JSON.parse(readFileSync(CACHE, 'utf8'));
  } catch {
    return {};
  }
}

const sameTarget = (a, b) => {
  const norm = (u) =>
    u
      .replace(/^http:/, 'https:')
      .replace(/\/(\?|#|$)/, '$1')
      .replace(/#.*$/, '');
  return norm(a) === norm(b);
};

function writeReport(found, cache, sources) {
  const rows = [...found.keys()].map((url) => ({ url, ...cache[url], where: [...found.get(url)] }));
  const by = (s) => rows.filter((r) => r.status === s);
  const dead = by('dead');
  const inconclusive = rows.filter((r) =>
    ['forbidden', 'timeout', 'error', 'redirect'].includes(r.status),
  );
  const moved = rows.filter(
    (r) => r.status === 'ok' && r.final_url && !sameTarget(r.url, r.final_url),
  );
  const unchecked = rows.filter((r) => !r.status);
  const where = (r) =>
    r.where
      .slice(0, 3)
      .map((w) => `\`${w}\``)
      .join(', ') + (r.where.length > 3 ? ` +${r.where.length - 3}` : '');
  const L = [];
  L.push('# Outbound links — last check', '');
  L.push(
    `*Generated by \`scripts/check-external-links.mjs\` on ${new Date().toISOString().slice(0, 10)}. Collected from ${sources.html} prerendered pages, ${sources.data} data files the app reads, translations, messages and components.*`,
    '',
  );
  L.push('| Result | URLs |', '| --- | ---: |');
  L.push(`| OK | ${by('ok').length} |`);
  L.push(`| … of which redirected to another address | ${moved.length} |`);
  L.push(`| Dead (404, 410, 5xx …) | ${dead.length} |`);
  L.push(`| Inconclusive (403, timeout, network error) | ${inconclusive.length} |`);
  L.push(`| Not checked yet | ${unchecked.length} |`);
  L.push(`| **Total** | **${rows.length}** |`, '');
  L.push(
    `Not probed: ${Object.entries(SKIP_HOSTS)
      .map(([h, why]) => `${h} (${why})`)
      .join('; ')}; this site's own addresses; direct links to media files.`,
    '',
  );
  // A "|" in a URL would split the table cell.
  const cell = (s) => String(s).replace(/\|/g, '%7C');
  const table = (out, title, list, extra) => {
    if (!list.length) return;
    out.push(`## ${title}`, '', '| URL | Status | Where |', '| --- | --- | --- |');
    for (const r of list.sort((a, b) => a.url.localeCompare(b.url)))
      out.push(
        `| ${cell(r.url)} | ${r.http_status ?? r.status}${extra ? cell(extra(r)) : ''} | ${where(r)} |`,
      );
    out.push('');
  };
  table(L, 'Dead', dead);
  table(L, 'Inconclusive — recheck by hand', inconclusive, (r) => (r.detail ? ` ${r.detail}` : ''));
  // Moved links work; the full list (~1,700 rows) stays out of the docs site.
  L.push(
    `Moved (working, but redirected elsewhere): ${moved.length} — listed in \`${relative(ROOT, MOVED)}\`.`,
    '',
  );
  const M = [`# Moved outbound links — ${new Date().toISOString().slice(0, 10)}`, ''];
  table(M, 'Moved — update when convenient', moved, (r) => ` → ${r.final_url}`);
  mkdirSync(dirname(REPORT), { recursive: true });
  writeFileSync(REPORT, L.join('\n'));
  writeFileSync(MOVED, M.join('\n'));
  return {
    dead: dead.length,
    inconclusive: inconclusive.length,
    moved: moved.length,
    total: rows.length,
    unchecked: unchecked.length,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { found, sources } = collect();
  if (args.list) {
    for (const [u, w] of found) console.log(`${u}\t${[...w][0]}`);
    console.log(`${found.size} URLs`);
    process.exit(0);
  }
  const cache = loadCache();
  const now = Date.now();
  let due = [...found.keys()].filter(
    (u) =>
      !cache[u] ||
      now - Date.parse(cache[u].checked_at) > maxAgeDays * 86_400_000 ||
      // --recheck=dead,timeout re-probes those results whatever their age
      (args.recheck && String(args.recheck).split(',').includes(cache[u].status)),
  );
  if (args.limit) due = due.slice(0, Number(args.limit));
  console.log(
    `→ ${found.size} outbound URLs (${sources.html} pages, ${sources.text} files); probing ${due.length} not checked in ${maxAgeDays} d`,
  );
  mkdirSync(dirname(CACHE), { recursive: true });
  // Each result goes into the cache as it lands, saved every 100, so an
  // interrupted run keeps what it already checked.
  await probeAll(due, {
    concurrency: Number(args.concurrency ?? 8),
    onProgress: (d, t, url, r) => {
      cache[url] = { ...r, checked_at: new Date().toISOString() };
      if (d % 100 === 0 || d === t) {
        console.log(`  · ${d}/${t}`);
        writeFileSync(CACHE, JSON.stringify(cache));
      }
    },
  });
  // Forget URLs the site no longer links to.
  for (const u of Object.keys(cache)) if (!found.has(u)) delete cache[u];
  writeFileSync(CACHE, JSON.stringify(cache));
  const s = writeReport(found, cache, sources);
  console.log(
    `${s.dead === 0 ? '✓' : '✗'} outbound links: ${s.total} total, ${s.dead} dead, ${s.inconclusive} inconclusive, ${s.moved} moved, ${s.unchecked} not checked — ${relative(ROOT, REPORT)}`,
  );
  process.exit(args.strict && s.dead > 0 ? 1 : 0);
}
