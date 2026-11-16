/**
 * Mission-name linkifier for body detail panels.
 *
 * Body panels render `mission_visits: string[]` entries like:
 *   "Voyager 2 — NASA, 1989 (only spacecraft to visit Neptune)"
 * This helper extracts the leading mission name (everything before
 * " — "), tries to resolve it against the live /missions and /fleet
 * id lists, and returns a {href, label} pair when a match exists so
 * the panel can render it as an anchor.
 *
 * Pragmatic resolver — tries the obvious normalisations:
 *   "Voyager 2"      → "voyager-2" (missions)
 *   "Mariner 4"      → "mariner4"  (missions, no-hyphen variant)
 *   "Cassini-Huygens" → "cassini-huygens" / "cassini"
 *   "ExoMars TGO"    → "exomars-tgo" / "exomars"
 *
 * No-match returns null and the caller renders plain text.
 *
 * Both ids are SSR-safe: the manifest is fetched once per session,
 * cached, and the second call resolves synchronously from cache.
 */
import { base } from '$app/paths';
import { localHref } from '$lib/locale';
import { browser } from '$app/environment';
import { loadI18nBundle } from '$lib/data/core';
import { getLocale } from '$lib/paraglide/runtime';

interface IndexEntry {
  id: string;
}

let missionIdCache: Set<string> | null = null;
let fleetIdCache: Set<string> | null = null;
let inflight: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  if (missionIdCache && fleetIdCache) return;
  if (!browser) {
    missionIdCache ??= new Set();
    fleetIdCache ??= new Set();
    return;
  }
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const [mRes, fRes] = await Promise.all([
        fetch(`${base}/data/missions/index.json`),
        fetch(`${base}/data/fleet/index.json`),
      ]);
      const m = mRes.ok ? ((await mRes.json()) as IndexEntry[] | { entries: IndexEntry[] }) : [];
      const f = fRes.ok ? ((await fRes.json()) as IndexEntry[] | { entries: IndexEntry[] }) : [];
      const mArr = Array.isArray(m) ? m : (m.entries ?? []);
      const fArr = Array.isArray(f) ? f : (f.entries ?? []);
      missionIdCache = new Set(mArr.map((e) => e.id));
      fleetIdCache = new Set(fArr.map((e) => e.id));
    } catch {
      missionIdCache ??= new Set();
      fleetIdCache ??= new Set();
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

// Localized mission / fleet names -> route, per locale. Body panels show the
// locale's own name ("«Луна-16»", "嫦娥四号", "चंद्रयान-3" under the
// origin-language rule), which the id candidates below can't match.
type MissionRoute = { kind: 'mission' | 'fleet'; id: string };
const nameIndex = new Map<string, Map<string, MissionRoute>>();
const namesInflight = new Map<string, Promise<void>>();

function normName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[«»"“”„'’]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function ensureNames(locale: string): Promise<void> {
  if (!browser || nameIndex.has(locale)) return Promise.resolve();
  const running = namesInflight.get(locale);
  if (running) return running;
  const job = Promise.all([
    loadI18nBundle(locale, 'fleet', fetch),
    loadI18nBundle(locale, 'missions', fetch),
  ])
    .then(([fleet, missions]) => {
      const bundle = { ...fleet, ...missions };
      const idx = new Map<string, MissionRoute>();
      // Fleet first so a mission with the same name wins (missions open the
      // mission panel, the more specific target).
      for (const kind of ['fleet', 'missions'] as const) {
        for (const [key, val] of Object.entries(bundle)) {
          const m = new RegExp(`^${kind}/[^/]+/([^/]+)\\.json$`).exec(key);
          const name = (val as { name?: unknown } | null)?.name;
          if (!m || typeof name !== 'string') continue;
          const route: MissionRoute = { kind: kind === 'missions' ? 'mission' : 'fleet', id: m[1] };
          for (const part of [name, ...name.split(/\s*\/\s*/)]) {
            if (part.trim()) idx.set(normName(part), route);
          }
        }
      }
      nameIndex.set(locale, idx);
    })
    .catch(() => {
      nameIndex.set(locale, new Map());
    })
    .finally(() => namesInflight.delete(locale));
  namesInflight.set(locale, job);
  return job;
}

/** Eagerly populate the cache (call once on panel mount). */
export function loadMissionIndex(): Promise<void> {
  return Promise.all([ensureLoaded(), ensureNames(getLocale())]).then(() => {});
}

function leadingMissionName(entry: string): string {
  // "Voyager 2 — NASA, 1989" → "Voyager 2"
  // "Voyager 2 / 1 — NASA"  → "Voyager 2 / 1"
  // Splits on em-dash first; falls back to first "(" or " — " absence.
  const dashIdx = entry.indexOf('—');
  if (dashIdx > 0) return entry.slice(0, dashIdx).trim();
  const parenIdx = entry.indexOf('(');
  if (parenIdx > 0) return entry.slice(0, parenIdx).trim();
  return entry.trim();
}

function normaliseCandidates(name: string): string[] {
  const lower = name.toLowerCase().trim();
  // 1. As-is, spaces → hyphens
  const kebab = lower.replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  // 2. Spaces stripped entirely (matches mariner4 / pioneer10 style)
  const flat = lower.replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
  // 3. Drop trailing version number ("voyager 1" → "voyager")
  const noTrailingNum = kebab.replace(/-\d+$/, '');
  // 4. First word only ("ExoMars TGO" → "exomars"; "Cassini-Huygens" → "cassini")
  const firstWord = lower.split(/[\s/+&-]/)[0].replace(/[^a-z0-9]/g, '');
  return [...new Set([kebab, flat, noTrailingNum, firstWord].filter(Boolean))];
}

/** Where a mission name leads: a mission (the body panel can open it in place) or a fleet
 *  entry (a navigation), with the href that reaches the same record without script. */
export interface MissionTarget {
  kind: 'mission' | 'fleet';
  id: string;
  href: string;
}

const targetOf = (kind: 'mission' | 'fleet', id: string): MissionTarget => ({
  kind,
  id,
  // Detail views open as a modal on the index page via ?id= (there is no
  // /missions/[id] or /fleet/[id] route) — matches every other deep-link.
  href: localHref(`/${kind === 'mission' ? 'missions' : 'fleet'}?id=${id}`),
});

/** Resolve a single mission name to its target, or null if neither /missions
 *  nor /fleet has a matching id. */
function resolveTarget(name: string): MissionTarget | null {
  if (!missionIdCache || !fleetIdCache) return null;
  for (const id of normaliseCandidates(name)) {
    if (missionIdCache.has(id)) return targetOf('mission', id);
    if (fleetIdCache.has(id)) return targetOf('fleet', id);
  }
  const route = nameIndex.get(getLocale())?.get(normName(name));
  return route ? targetOf(route.kind, route.id) : null;
}

/** Resolve a mission name to a link target. Returns null if neither
 *  /missions nor /fleet has a matching id. */
export function linkifyMission(
  entry: string,
): (MissionTarget & { label: string; rest: string }) | null {
  const label = leadingMissionName(entry);
  const target = resolveTarget(label);
  return target ? { ...target, label, rest: entry.slice(label.length) } : null;
}

export interface MissionSegment {
  text: string;
  href?: string;
  kind?: 'mission' | 'fleet';
  id?: string;
}

/**
 * A click on a mission link in a body panel: a mission opens in place (the body stays selected,
 * the mission panel opens over it), a fleet entry navigates. Without a handler, or with a
 * modifier key (open in a new tab), the anchor does what an anchor does.
 */
export function onMissionLinkClick(
  event: MouseEvent,
  target: { kind?: 'mission' | 'fleet'; id?: string },
  open: ((missionId: string) => void) | undefined,
): void {
  if (!open || target.kind !== 'mission' || !target.id) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
    return;
  event.preventDefault();
  open(target.id);
}

const FIRST_YEAR = /(1[89]\d\d|20\d\d)/;

/** The first four-digit year in a mission entry ("Voyager 2 — NASA, 1989 (…)"), or null. */
export function entryYear(entry: string): number | null {
  const m = FIRST_YEAR.exec(entry);
  return m ? Number(m[1]) : null;
}

/**
 * A body's mission list, newest first. The key is each entry's first year, read from
 * `baseEntries` when the caller has the en-US list (a locale overlay keeps the base order and
 * length, so one permutation serves every locale), else from the entries themselves. Entries
 * without a year go last; equal years keep their order.
 */
export function sortNewestFirst(
  entries: readonly string[],
  baseEntries: readonly string[] = entries,
): string[] {
  const keys = baseEntries.length === entries.length ? baseEntries : entries;
  return entries
    .map((entry, i) => ({ entry, i, year: entryYear(keys[i]) ?? entryYear(entry) ?? -Infinity }))
    .sort((a, b) => b.year - a.year || a.i - b.i)
    .map((x) => x.entry);
}

/**
 * Compound-aware linkifier. Splits the leading mission-name part of a
 * body-panel entry on " + " / " / " / ", " and linkifies each token that
 * resolves to a /missions or /fleet record, so compound entries like
 * "Mars Express + ExoMars TGO" or "Voyager 1 + 2" each get per-mission
 * links. Bare number tokens ("Mariner 5 / 10") inherit the base name of the
 * first token. Tokens with no matching record stay plain text. Returns
 * text + separator + link segments the panel renders in order.
 */
export function linkifyMissionEntry(entry: string): MissionSegment[] {
  if (!missionIdCache || !fleetIdCache) return [{ text: entry }];
  const dashIdx = entry.indexOf('—');
  const parenIdx = entry.indexOf('(');
  const leadEnd = dashIdx > 0 ? dashIdx : parenIdx > 0 ? parenIdx : entry.length;
  const lead = entry.slice(0, leadEnd);
  const rest = entry.slice(leadEnd);

  // split() with a capturing group keeps the separators as odd elements.
  const parts = lead.split(/(\s*[+/,]\s*)/);
  let basePrefix = '';
  const segs: MissionSegment[] = [];
  for (const part of parts) {
    if (part.trim() === '' || /^\s*[+/,]\s*$/.test(part)) {
      segs.push({ text: part });
      continue;
    }
    const token = part.trim();
    let resolveName = token;
    if (/^\d/.test(token) && basePrefix) {
      // Bare number/range ("10" in "Mariner 5 / 10") → prefix with base.
      resolveName = `${basePrefix} ${token}`;
    } else {
      const m = token.match(/^([A-Za-z][A-Za-z .'-]*?)(?:\s+\d.*)?$/);
      basePrefix = (m ? m[1] : token).trim();
    }
    const target = resolveTarget(resolveName);
    const leadWs = part.match(/^\s*/)?.[0] ?? '';
    const trailWs = part.match(/\s*$/)?.[0] ?? '';
    if (leadWs) segs.push({ text: leadWs });
    segs.push(
      target
        ? { text: token, href: target.href, kind: target.kind, id: target.id }
        : { text: token },
    );
    if (trailWs) segs.push({ text: trailWs });
  }
  segs.push({ text: rest });
  return segs;
}
