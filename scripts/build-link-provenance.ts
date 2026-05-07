/**
 * ADR-051 Milestone L-B — outbound LEARN-link provenance manifest writer.
 *
 * Walks every JSON file under `static/data/` (and `static/data/i18n/en-US/`
 * for overlay-side links), collects the structured `links: [{l,u,t}]`
 * arrays plus the single-string `wiki` field on small bodies, classifies
 * each URL by host and tier, then writes:
 *   - static/data/link-provenance.json
 *   - docs/provenance/last-link-provenance-diff.md
 *
 * Fails closed when a URL cannot be classified to a known `source_id` in
 * `static/data/source-logos.json`. The manifest is the single source of
 * truth consumed by validate-data, the runtime data layer, the
 * LinkCredit component, and the public /library page.
 *
 * Run via:
 *   npm run build-link-provenance
 *
 * Designed to be re-run as part of `npm run fetch` so the manifest never
 * drifts from the data files that motivated the links.
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

// ──────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────

const SCRIPT_VERSION = 'build-link-provenance@1.0.0';
const SCHEMA_VERSION = 1;

const PROVENANCE_OUT = 'static/data/link-provenance.json';
const DIFF_REPORT_OUT = 'docs/provenance/last-link-provenance-diff.md';
const SOURCE_LOGOS_PATH = 'static/data/source-logos.json';

const DATA_ROOT = 'static/data';

// ──────────────────────────────────────────────────────────────────────
// Types — mirror static/data/schemas/link-provenance.schema.json
// ──────────────────────────────────────────────────────────────────────

type Tier = 'intro' | 'core' | 'deep';
type Kind =
  | 'agency-official'
  | 'mission-microsite'
  | 'science-publisher'
  | 'encyclopedic'
  | 'educational'
  | 'community'
  | 'vendor-official';
type Category =
  | 'mission'
  | 'iss-module'
  | 'iss-visitor'
  | 'earth-object'
  | 'moon-site'
  | 'mars-site'
  | 'planet'
  | 'sun'
  | 'rocket'
  | 'small-body'
  | 'scenario';

interface LinkEntry {
  id: string;
  entity_id: string;
  category: Category;
  route: string;
  url: string;
  label: string;
  tier: Tier;
  source_id: string;
  language: string;
  kind: Kind;
  fair_use_rationale: string;
  last_verified: string;
  replaced_with?: string | null;
  notes?: string | null;
}

interface ProvenanceManifest {
  schema_version: number;
  generated_at: string;
  script_version: string;
  commit_sha: string | null;
  entries: LinkEntry[];
}

// ──────────────────────────────────────────────────────────────────────
// Host → source classification table.
//
// The keys are the *bare* hostname (after stripping a leading `www.`).
// Subdomains that resolve to the same publisher share the same entry.
// `defaultKind` and `defaultLanguage` are author-time guesses; per-link
// overrides happen via inferKind() / inferLanguage() below.
//
// This table is the single place to add a new source. When you add one,
// also add a row to static/data/source-logos.json (or validate-data
// fails closed).
// ──────────────────────────────────────────────────────────────────────

interface HostRule {
  source_id: string;
  defaultKind: Kind;
  defaultLanguage: string;
}

const HOST_RULES: Array<{ match: RegExp; rule: HostRule }> = [
  // NASA family ─────────────────────────────────────────────────────────
  {
    match: /(^|\.)nasa\.gov$/i,
    rule: { source_id: 'nasa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)gsfc\.nasa\.gov$/i,
    rule: { source_id: 'nasa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)jpl\.nasa\.gov$/i,
    rule: { source_id: 'nasa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },
  {
    match: /^lroc\.asu\.edu$/i,
    rule: { source_id: 'nasa', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^chandra\.harvard\.edu$/i,
    rule: { source_id: 'nasa', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^articles\.adsabs\.harvard\.edu$/i,
    rule: { source_id: 'nasa', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },

  // STScI ────────────────────────────────────────────────────────────────
  {
    match: /^(www\.)?stsci\.edu$/i,
    rule: { source_id: 'stsci', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^hubblesite\.org$/i,
    rule: { source_id: 'stsci', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^webbtelescope\.org$/i,
    rule: { source_id: 'stsci', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^esahubble\.org$/i,
    rule: { source_id: 'esa', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },
  {
    match: /^esawebb\.org$/i,
    rule: { source_id: 'esa', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },

  // ESA family ──────────────────────────────────────────────────────────
  {
    match: /(^|\.)esa\.int$/i,
    rule: { source_id: 'esa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },
  {
    match: /^seis-insight\.eu$/i,
    rule: { source_id: 'ipgp', defaultKind: 'mission-microsite', defaultLanguage: 'en' },
  },

  // JAXA family ─────────────────────────────────────────────────────────
  {
    match: /(^|\.)jaxa\.jp$/i,
    rule: { source_id: 'jaxa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // ISRO ────────────────────────────────────────────────────────────────
  {
    match: /(^|\.)isro\.gov\.in$/i,
    rule: { source_id: 'isro', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // Roscosmos ───────────────────────────────────────────────────────────
  {
    match: /(^|\.)roscosmos\.ru$/i,
    rule: { source_id: 'roscosmos', defaultKind: 'agency-official', defaultLanguage: 'ru' },
  },
  {
    match: /(^|\.)glonass-iac\.ru$/i,
    rule: { source_id: 'roscosmos', defaultKind: 'mission-microsite', defaultLanguage: 'ru' },
  },

  // CNSA ────────────────────────────────────────────────────────────────
  {
    match: /(^|\.)cnsa\.gov\.cn$/i,
    rule: { source_id: 'cnsa', defaultKind: 'agency-official', defaultLanguage: '*' },
  },
  {
    match: /(^|\.)clep\.org\.cn$/i,
    rule: { source_id: 'cnsa', defaultKind: 'mission-microsite', defaultLanguage: 'zh' },
  },
  {
    match: /(^|\.)cmse\.gov\.cn$/i,
    rule: { source_id: 'cnsa', defaultKind: 'agency-official', defaultLanguage: '*' },
  },
  {
    match: /(^|\.)beidou\.gov\.cn$/i,
    rule: { source_id: 'cnsa', defaultKind: 'mission-microsite', defaultLanguage: '*' },
  },

  // MBRSC / UAE ─────────────────────────────────────────────────────────
  {
    match: /(^|\.)mbrsc\.ae$/i,
    rule: { source_id: 'uaesa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)space\.gov\.ae$/i,
    rule: { source_id: 'uaesa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // CSA ─────────────────────────────────────────────────────────────────
  {
    match: /(^|\.)asc-csa\.gc\.ca$/i,
    rule: { source_id: 'csa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // NOAA ────────────────────────────────────────────────────────────────
  {
    match: /(^|\.)noaa\.gov$/i,
    rule: { source_id: 'noaa', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // U.S. Space Force / GPS ──────────────────────────────────────────────
  {
    match: /^(www\.)?gps\.gov$/i,
    rule: { source_id: 'us-space-force', defaultKind: 'agency-official', defaultLanguage: 'en' },
  },

  // Private operators ───────────────────────────────────────────────────
  {
    match: /(^|\.)spacex\.com$/i,
    rule: { source_id: 'spacex', defaultKind: 'vendor-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)blueorigin\.com$/i,
    rule: { source_id: 'blue-origin', defaultKind: 'vendor-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)boeing\.com$/i,
    rule: { source_id: 'boeing', defaultKind: 'vendor-official', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)ulalaunch\.com$/i,
    rule: { source_id: 'ula', defaultKind: 'vendor-official', defaultLanguage: 'en' },
  },

  // Wikipedia / Wikimedia ───────────────────────────────────────────────
  {
    match: /(^|\.)wikipedia\.org$/i,
    rule: { source_id: 'wikipedia', defaultKind: 'encyclopedic', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)wikimedia\.org$/i,
    rule: { source_id: 'wikimedia-commons', defaultKind: 'encyclopedic', defaultLanguage: '*' },
  },

  // Science publishers ──────────────────────────────────────────────────
  {
    match: /(^|\.)nature\.com$/i,
    rule: { source_id: 'nature', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)science\.org$/i,
    rule: { source_id: 'science-aaas', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)sciencedirect\.com$/i,
    rule: { source_id: 'elsevier', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)iopscience\.iop\.org$/i,
    rule: { source_id: 'iop', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)annualreviews\.org$/i,
    rule: { source_id: 'annual-reviews', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)springer\.com$/i,
    rule: { source_id: 'springer', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /^(www\.)?ieeexplore\.ieee\.org$/i,
    rule: { source_id: 'ieee', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /^(www\.)?nap\.nationalacademies\.org$/i,
    rule: { source_id: 'nap', defaultKind: 'science-publisher', defaultLanguage: 'en' },
  },
  {
    match: /(^|\.)planetary\.org$/i,
    rule: { source_id: 'planetary-society', defaultKind: 'educational', defaultLanguage: 'en' },
  },
];

function classifyHost(url: string): HostRule {
  // Normalise host: drop a leading `www.` so the rule table doesn't
  // need to encode it on every entry. Anything that semantically
  // differs at the `www.` boundary should rely on the explicit regex.
  const host = new URL(url).hostname.replace(/^www\./i, '');
  for (const { match, rule } of HOST_RULES) {
    if (match.test(host)) return rule;
  }
  throw new Error(
    `Unclassified host: ${host} (URL: ${url}). Add a HOST_RULES entry in scripts/build-link-provenance.ts and a matching source-logos.json row.`,
  );
}

// ──────────────────────────────────────────────────────────────────────
// URL canonicalisation
// ──────────────────────────────────────────────────────────────────────

const TRACKER_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'fbclid',
  'gclid',
  'mc_cid',
  'mc_eid',
  '_ga',
]);

function canonicaliseUrl(raw: string): string {
  const u = new URL(raw);
  // Strip "m." mobile prefix → desktop equivalent.
  if (u.hostname.startsWith('m.')) {
    const rest = u.hostname.slice(2);
    // Don't rewrite legitimate hosts like `m.media-amazon.com`; only the
    // common encyclopedic / news pattern (`m.wikipedia.org`,
    // `m.nasa.gov`, etc.).
    if (/^(wikipedia|wikimedia|nasa|esa|jaxa|isro|cnsa|roscosmos)\./i.test(rest)) {
      u.hostname = rest;
    }
  }
  // Strip AMP suffix.
  if (u.pathname.endsWith('/amp') || u.pathname.endsWith('/amp/')) {
    u.pathname = u.pathname.replace(/\/amp\/?$/, '');
  }
  // Drop tracker params.
  const drop: string[] = [];
  for (const [k] of u.searchParams) {
    if (TRACKER_PARAMS.has(k.toLowerCase())) drop.push(k);
  }
  for (const k of drop) u.searchParams.delete(k);
  // Strip fragment.
  u.hash = '';
  // Lowercase host (URL constructor already does this) and reassemble.
  return u.toString();
}

// ──────────────────────────────────────────────────────────────────────
// Tier inference
//
// Author-time `t` field on the link entry maps directly to tier. We
// honour it when present; otherwise default by category.
// ──────────────────────────────────────────────────────────────────────

function inferTier(rawT: unknown, fallback: Tier = 'core'): Tier {
  if (rawT === 'intro' || rawT === 'core' || rawT === 'deep') return rawT;
  return fallback;
}

// ──────────────────────────────────────────────────────────────────────
// Per-link kind inference — sometimes the host default is too coarse.
// e.g. nasa.gov can be agency-official OR mission-microsite depending on
// path. The defaults are good enough for the v0.5.0 scope; we keep the
// hook for future refinement.
// ──────────────────────────────────────────────────────────────────────

function inferKind(rawT: unknown, defaults: HostRule, _url: string): Kind {
  const tier = inferTier(rawT, 'core');
  if (defaults.defaultKind === 'agency-official' && tier === 'deep') {
    // Agency `deep` links are usually press-release archives — still
    // agency-official but worth keeping as such.
    return 'agency-official';
  }
  return defaults.defaultKind;
}

// ──────────────────────────────────────────────────────────────────────
// Language inference — derive BCP-47 from URL when more specific than
// the host default. Wikipedia subdomains (`es.wikipedia.org`) reveal
// language; bilingual hosts (`global.jaxa.jp` vs `humans-in-space.jaxa.jp`)
// keep the default.
// ──────────────────────────────────────────────────────────────────────

function inferLanguage(url: string, defaults: HostRule): string {
  const host = new URL(url).hostname;
  // Wikipedia: language is the first label.
  const wiki = host.match(/^([a-z]{2,3})\.wikipedia\.org$/);
  if (wiki) return wiki[1];
  // Some agencies route language through path prefix (e.g. `/en/` vs `/zh/`).
  const path = new URL(url).pathname;
  const langPath = path.match(/^\/(en|ru|zh|ja|hi|ar|es|fr|de|it|pt|sr|ko|tr)(\/|$)/i);
  if (langPath) return langPath[1].toLowerCase();
  return defaults.defaultLanguage;
}

// ──────────────────────────────────────────────────────────────────────
// Walk every data file, collect link entries.
// ──────────────────────────────────────────────────────────────────────

interface RawLink {
  url: string;
  label: string;
  rawT: unknown;
  entity_id: string;
  category: Category;
  route: string;
  source_file: string;
}

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function asArray<T = unknown>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

function collectFromMissionDir(): RawLink[] {
  const out: RawLink[] = [];
  const root = join(DATA_ROOT, 'missions');
  if (!existsSync(root)) return out;
  // Each *directory* under missions/ is a destination (mars, moon, …).
  // The top-level missions/index.json is a flat manifest; skip it.
  const dests = listDir(root).filter((d) => isDir(join(root, d)));
  for (const dest of dests) {
    const dir = join(root, dest);
    for (const f of listDir(dir)) {
      if (!f.endsWith('.json')) continue;
      const file = join(dir, f);
      const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      const id = String(j.id ?? f.replace(/\.json$/, ''));
      const links = asArray(j.links);
      for (const ln of links) {
        if (!isObj(ln) || typeof ln.u !== 'string') continue;
        out.push({
          url: ln.u,
          label: String(ln.l ?? ln.u),
          rawT: ln.t,
          entity_id: id,
          category: 'mission',
          route: '/missions',
          source_file: file,
        });
      }
    }
  }
  return out;
}

function collectFromI18nMissions(): RawLink[] {
  const out: RawLink[] = [];
  const root = join(DATA_ROOT, 'i18n', 'en-US', 'missions');
  if (!existsSync(root)) return out;
  for (const dest of listDir(root)) {
    const dir = join(root, dest);
    if (!isDir(dir)) continue;
    for (const f of listDir(dir)) {
      if (!f.endsWith('.json')) continue;
      const file = join(dir, f);
      const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
      const id = f.replace(/\.json$/, '');
      const links = asArray(j.links);
      for (const ln of links) {
        if (!isObj(ln) || typeof ln.u !== 'string') continue;
        out.push({
          url: ln.u,
          label: String(ln.l ?? ln.u),
          rawT: ln.t,
          entity_id: id,
          category: 'mission',
          route: '/missions',
          source_file: file,
        });
      }
    }
  }
  return out;
}

function collectFromTopLevelArrayFile(
  file: string,
  category: Category,
  route: string,
  topKey: string | null,
): RawLink[] {
  const out: RawLink[] = [];
  const fullPath = join(DATA_ROOT, file);
  if (!existsSync(fullPath)) return out;
  const j = JSON.parse(readFileSync(fullPath, 'utf8')) as unknown;
  const arr: unknown[] = topKey
    ? asArray((j as Record<string, unknown>)[topKey])
    : Array.isArray(j)
      ? j
      : [];
  for (const item of arr) {
    if (!isObj(item)) continue;
    const id = String(item.id ?? '');
    if (!id) continue;
    const links = asArray(item.links);
    for (const ln of links) {
      if (!isObj(ln) || typeof ln.u !== 'string') continue;
      out.push({
        url: ln.u,
        label: String(ln.l ?? ln.u),
        rawT: ln.t,
        entity_id: id,
        category,
        route,
        source_file: fullPath,
      });
    }
    // small-bodies.json carries a single `wiki` field per entry instead of
    // structured links — synthesise an entry.
    if (typeof item.wiki === 'string' && /^https?:/.test(item.wiki)) {
      out.push({
        url: item.wiki,
        label: 'Wikipedia',
        rawT: 'core',
        entity_id: id,
        category,
        route,
        source_file: fullPath,
      });
    }
  }
  return out;
}

/**
 * Per-id overlay collector — i18n trees mostly use one file per entity:
 *   static/data/i18n/en-US/<subdir>/<id>.json
 * carrying overlay fields (description, name, links, …). The base id is
 * the filename stem.
 */
function collectFromI18nPerIdDir(subdir: string, category: Category, route: string): RawLink[] {
  const out: RawLink[] = [];
  const dir = join(DATA_ROOT, 'i18n', 'en-US', subdir);
  if (!existsSync(dir)) return out;
  for (const f of listDir(dir)) {
    if (!f.endsWith('.json')) continue;
    const file = join(dir, f);
    const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const id = f.replace(/\.json$/, '');
    const links = asArray(j.links);
    for (const ln of links) {
      if (!isObj(ln) || typeof ln.u !== 'string') continue;
      out.push({
        url: ln.u,
        label: String(ln.l ?? ln.u),
        rawT: ln.t,
        entity_id: id,
        category,
        route,
        source_file: file,
      });
    }
  }
  return out;
}

function collectFromI18nPlanets(): RawLink[] {
  const out: RawLink[] = [];
  const dir = join(DATA_ROOT, 'i18n', 'en-US', 'planets');
  if (!existsSync(dir)) return out;
  for (const f of listDir(dir)) {
    if (!f.endsWith('.json')) continue;
    const file = join(dir, f);
    const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const id = f.replace(/\.json$/, '');
    const links = asArray(j.links);
    for (const ln of links) {
      if (!isObj(ln) || typeof ln.u !== 'string') continue;
      out.push({
        url: ln.u,
        label: String(ln.l ?? ln.u),
        rawT: ln.t,
        entity_id: id,
        category: 'planet',
        route: '/explore',
        source_file: file,
      });
    }
  }
  return out;
}

function collectFromSun(): RawLink[] {
  const out: RawLink[] = [];
  const baseFile = join(DATA_ROOT, 'sun.json');
  const overlay = join(DATA_ROOT, 'i18n', 'en-US', 'sun.json');
  for (const file of [baseFile, overlay]) {
    if (!existsSync(file)) continue;
    const j = JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>;
    const links = asArray(j.links);
    for (const ln of links) {
      if (!isObj(ln) || typeof ln.u !== 'string') continue;
      out.push({
        url: ln.u,
        label: String(ln.l ?? ln.u),
        rawT: ln.t,
        entity_id: 'sun',
        category: 'sun',
        route: '/explore',
        source_file: file,
      });
    }
  }
  return out;
}

function listDir(p: string): string[] {
  try {
    return readdirSync(p);
  } catch {
    return [];
  }
}
function isDir(p: string): boolean {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────
// Build entries
// ──────────────────────────────────────────────────────────────────────

function makeId(entityId: string, url: string): string {
  const h = createHash('sha256').update(`${entityId}__${url}`).digest('hex').slice(0, 12);
  return `${entityId}__${h}`;
}

const DEFAULT_FAIR_USE =
  'External reference; no copyrighted material redistributed; rendered with rel=noopener noreferrer external';

function inferTierFromCategoryFallback(category: Category): Tier {
  // intro/core/deep has author-time semantics, but if missing default to
  // 'core' for everything except small-bodies (whose `wiki` is intro by
  // construction).
  if (category === 'small-body') return 'core';
  return 'core';
}

function buildEntry(raw: RawLink, today: string): LinkEntry {
  const url = canonicaliseUrl(raw.url);
  const host = classifyHost(url);
  const tier = inferTier(raw.rawT, inferTierFromCategoryFallback(raw.category));
  const language = inferLanguage(url, host);
  const kind = inferKind(raw.rawT, host, url);
  return {
    id: makeId(raw.entity_id, url),
    entity_id: raw.entity_id,
    category: raw.category,
    route: raw.route,
    url,
    label: raw.label,
    tier,
    source_id: host.source_id,
    language,
    kind,
    fair_use_rationale: DEFAULT_FAIR_USE,
    last_verified: today,
  };
}

function readGitSha(): string | null {
  try {
    return execSync('git rev-parse HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return null;
  }
}

function loadKnownSourceIds(): Set<string> {
  const j = JSON.parse(readFileSync(SOURCE_LOGOS_PATH, 'utf8')) as {
    sources: { id: string }[];
  };
  return new Set(j.sources.map((s) => s.id));
}

function loadExistingManifest(): ProvenanceManifest | null {
  if (!existsSync(PROVENANCE_OUT)) return null;
  try {
    return JSON.parse(readFileSync(PROVENANCE_OUT, 'utf8')) as ProvenanceManifest;
  } catch {
    return null;
  }
}

function diffEntries(prev: LinkEntry[] | null, next: LinkEntry[]): string {
  const lines: string[] = [];
  lines.push(`# Last link-provenance build`);
  lines.push('');
  lines.push(`> Generated: ${new Date().toISOString()}`);
  lines.push('');
  if (!prev || prev.length === 0) {
    lines.push(`Initial manifest: **${next.length}** entries.`);
    return lines.join('\n') + '\n';
  }
  const prevById = new Map(prev.map((e) => [e.id, e]));
  const nextById = new Map(next.map((e) => [e.id, e]));
  const added = next.filter((e) => !prevById.has(e.id));
  const removed = prev.filter((e) => !nextById.has(e.id));
  const changed: Array<{ before: LinkEntry; after: LinkEntry }> = [];
  for (const e of next) {
    const before = prevById.get(e.id);
    if (!before) continue;
    if (JSON.stringify(before) !== JSON.stringify(e)) changed.push({ before, after: e });
  }
  lines.push(`- Total entries: ${next.length} (was ${prev.length})`);
  lines.push(`- Added: ${added.length}`);
  lines.push(`- Removed: ${removed.length}`);
  lines.push(`- Changed: ${changed.length}`);
  lines.push('');
  if (added.length) {
    lines.push(`## Added (${added.length})`);
    for (const e of added.slice(0, 100)) {
      lines.push(`- \`${e.entity_id}\` · ${e.tier} · ${e.source_id} · ${e.language} · <${e.url}>`);
    }
    if (added.length > 100) lines.push(`- … ${added.length - 100} more`);
    lines.push('');
  }
  if (removed.length) {
    lines.push(`## Removed (${removed.length})`);
    for (const e of removed.slice(0, 100)) {
      lines.push(`- \`${e.entity_id}\` · ${e.tier} · ${e.source_id} · <${e.url}>`);
    }
    if (removed.length > 100) lines.push(`- … ${removed.length - 100} more`);
    lines.push('');
  }
  if (changed.length) {
    lines.push(`## Changed (${changed.length})`);
    for (const { before, after } of changed.slice(0, 50)) {
      const fields = (['url', 'label', 'tier', 'source_id', 'language', 'kind'] as const).filter(
        (k) => before[k] !== after[k],
      );
      lines.push(
        `- \`${after.entity_id}\` · ${fields.map((f) => `${f}: ${JSON.stringify(before[f])} → ${JSON.stringify(after[f])}`).join('; ')}`,
      );
    }
    if (changed.length > 50) lines.push(`- … ${changed.length - 50} more`);
    lines.push('');
  }
  return lines.join('\n') + '\n';
}

// ──────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`${SCRIPT_VERSION} — building outbound LEARN-link provenance manifest`);
  const today = new Date().toISOString().slice(0, 10);

  // Verify host-classification table covers all known source ids.
  const knownSourceIds = loadKnownSourceIds();
  const referenced = new Set(HOST_RULES.map((r) => r.rule.source_id));
  const orphans = [...referenced].filter((id) => !knownSourceIds.has(id));
  if (orphans.length > 0) {
    console.error(
      `\nERROR: HOST_RULES references source_id(s) missing from source-logos.json:\n  ${orphans.join('\n  ')}`,
    );
    process.exit(1);
  }

  // Walk every data surface. Wrapper-key shapes:
  //   * iss-modules.json, iss-visitors.json, earth-objects.json,
  //     moon-sites.json, mars-sites.json, rockets.json → top-level array
  //   * small-bodies.json → { bodies: [...] }
  //   * planets.json → { constants, planets: [...] } (links live in
  //     i18n overlays, not the base file)
  //   * sun.json → object with `links` directly
  const collectors: Array<{ label: string; run: () => RawLink[] }> = [
    { label: 'missions/<dest>/*.json', run: () => collectFromMissionDir() },
    { label: 'i18n/en-US/missions/<dest>/*.json', run: () => collectFromI18nMissions() },
    {
      label: 'iss-modules.json',
      run: () => collectFromTopLevelArrayFile('iss-modules.json', 'iss-module', '/iss', null),
    },
    {
      label: 'i18n/en-US/iss-modules/*.json',
      run: () => collectFromI18nPerIdDir('iss-modules', 'iss-module', '/iss'),
    },
    {
      label: 'iss-visitors.json',
      run: () => collectFromTopLevelArrayFile('iss-visitors.json', 'iss-visitor', '/iss', null),
    },
    {
      label: 'i18n/en-US/iss-visitors/*.json',
      run: () => collectFromI18nPerIdDir('iss-visitors', 'iss-visitor', '/iss'),
    },
    {
      label: 'earth-objects.json',
      run: () => collectFromTopLevelArrayFile('earth-objects.json', 'earth-object', '/earth', null),
    },
    {
      label: 'i18n/en-US/earth-objects/*.json',
      run: () => collectFromI18nPerIdDir('earth-objects', 'earth-object', '/earth'),
    },
    {
      label: 'moon-sites.json',
      run: () => collectFromTopLevelArrayFile('moon-sites.json', 'moon-site', '/moon', null),
    },
    {
      label: 'i18n/en-US/moon-sites/*.json',
      run: () => collectFromI18nPerIdDir('moon-sites', 'moon-site', '/moon'),
    },
    {
      label: 'mars-sites.json',
      run: () => collectFromTopLevelArrayFile('mars-sites.json', 'mars-site', '/mars', null),
    },
    {
      label: 'i18n/en-US/mars-sites/*.json',
      run: () => collectFromI18nPerIdDir('mars-sites', 'mars-site', '/mars'),
    },
    {
      label: 'rockets.json',
      run: () => collectFromTopLevelArrayFile('rockets.json', 'rocket', '/missions', null),
    },
    {
      label: 'i18n/en-US/rockets/*.json',
      run: () => collectFromI18nPerIdDir('rockets', 'rocket', '/missions'),
    },
    {
      label: 'small-bodies.json',
      run: () =>
        collectFromTopLevelArrayFile('small-bodies.json', 'small-body', '/explore', 'bodies'),
    },
    { label: 'i18n/en-US/planets/*.json', run: () => collectFromI18nPlanets() },
    { label: 'sun.json + i18n overlay', run: () => collectFromSun() },
  ];
  const raw: RawLink[] = [];
  for (const { label, run } of collectors) {
    const got = run();
    raw.push(...got);
    console.log(`  ${String(got.length).padStart(4)} ${label}`);
  }

  console.log(`Collected ${raw.length} raw link references.`);

  // Build + dedupe by (entity_id, canonical_url).
  const seen = new Map<string, LinkEntry>();
  for (const r of raw) {
    try {
      const e = buildEntry(r, today);
      const key = `${e.entity_id}__${e.url}`;
      if (!seen.has(key)) seen.set(key, e);
    } catch (err) {
      console.error(`  ✗ ${r.source_file} · ${r.entity_id} · ${(err as Error).message}`);
      process.exitCode = 1;
    }
  }
  if (process.exitCode) {
    console.error('\nFailing closed: fix HOST_RULES + source-logos.json and re-run.');
    process.exit(1);
  }

  // Preserve last_verified from the existing manifest when we re-run
  // without running the link-checker. Replace with `today` only for new
  // rows.
  const existing = loadExistingManifest();
  if (existing) {
    const prevByKey = new Map(existing.entries.map((e) => [`${e.entity_id}__${e.url}`, e]));
    for (const [key, entry] of seen) {
      const before = prevByKey.get(key);
      if (before) {
        entry.last_verified = before.last_verified;
        if (before.replaced_with) entry.replaced_with = before.replaced_with;
        if (before.notes) entry.notes = before.notes;
      }
    }
  }

  // Stable sort: entity_id, then tier, then url.
  const tierOrder: Record<Tier, number> = { intro: 0, core: 1, deep: 2 };
  const entries = [...seen.values()].sort(
    (a, b) =>
      a.entity_id.localeCompare(b.entity_id) ||
      tierOrder[a.tier] - tierOrder[b.tier] ||
      a.url.localeCompare(b.url),
  );

  const manifest: ProvenanceManifest = {
    schema_version: SCHEMA_VERSION,
    generated_at: new Date().toISOString(),
    script_version: SCRIPT_VERSION,
    commit_sha: readGitSha(),
    entries,
  };

  await writeFile(PROVENANCE_OUT, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\nWrote ${PROVENANCE_OUT} (${entries.length} entries)`);

  // Diff report.
  await mkdir('docs/provenance', { recursive: true });
  const diff = diffEntries(existing?.entries ?? null, entries);
  await writeFile(DIFF_REPORT_OUT, diff);
  console.log(`Wrote ${DIFF_REPORT_OUT}`);
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
