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
import { browser } from '$app/environment';

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

/** Eagerly populate the cache (call once on panel mount). */
export function loadMissionIndex(): Promise<void> {
  return ensureLoaded();
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

/** Resolve a single mission name to an href, or null if neither /missions
 *  nor /fleet has a matching id. */
function resolveHref(name: string): string | null {
  if (!missionIdCache || !fleetIdCache) return null;
  for (const id of normaliseCandidates(name)) {
    // Detail views open as a modal on the index page via ?id= (there is no
    // /missions/[id] or /fleet/[id] route) — matches every other deep-link.
    if (missionIdCache.has(id)) return `${base}/missions?id=${id}`;
    if (fleetIdCache.has(id)) return `${base}/fleet?id=${id}`;
  }
  return null;
}

/** Resolve a mission name to a link target. Returns null if neither
 *  /missions nor /fleet has a matching id. */
export function linkifyMission(
  entry: string,
): { href: string; label: string; rest: string } | null {
  const label = leadingMissionName(entry);
  const href = resolveHref(label);
  return href ? { href, label, rest: entry.slice(label.length) } : null;
}

export interface MissionSegment {
  text: string;
  href?: string;
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
    const href = resolveHref(resolveName);
    const leadWs = part.match(/^\s*/)?.[0] ?? '';
    const trailWs = part.match(/\s*$/)?.[0] ?? '';
    if (leadWs) segs.push({ text: leadWs });
    segs.push(href ? { text: token, href } : { text: token });
    if (trailWs) segs.push({ text: trailWs });
  }
  segs.push({ text: rest });
  return segs;
}
