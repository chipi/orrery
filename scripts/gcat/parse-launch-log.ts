/**
 * Pure-function parser for Jonathan McDowell's GCAT `launch.tsv` (the master
 * launch list at `https://planet4589.org/space/gcat/tsv/launch/launch.tsv`).
 *
 * The TSV is tab-separated with a comment-prefixed header row (`#Launch_Tag\t...`)
 * and a free-text "# Updated YYYY MMM DD HHmm:ss" line. Subsequent data
 * rows are 28 fields wide, frequently padded with spaces.
 *
 * GCAT is released CC-BY by J.C. McDowell. PRD-020 / RFC-023 §12.1.
 */
import type { LaunchNetPrecision, LaunchStatus, LaunchStatusCode, RawLaunchEntry } from '../../src/lib/launches/types.js';
import { buildStableId, slugify } from '../../src/lib/launches/id.js';

/**
 * Authoritative column order (28 fields) — matches Release 1.8.0 of the
 * GCAT Orbital Launch Log. Asserted against the parser fixture
 * `__fixtures__/launch-log-header.tsv`; a column-name drift bumps a build
 * failure so the operator catches the schema bump explicitly.
 */
export const GCAT_LAUNCH_COLUMNS = [
  '#Launch_Tag',
  'Launch_JD',
  'Launch_Date',
  'LV_Type',
  'Variant',
  'Flight_ID',
  'Flight',
  'Mission',
  'FlightCode',
  'Platform',
  'Launch_Site',
  'Launch_Pad',
  'Ascent_Site',
  'Ascent_Pad',
  'Apogee',
  'Apoflag',
  'Range',
  'RangeFlag',
  'Dest',
  'OrbPay',
  'Agency',
  'LaunchCode',
  'FailCode',
  'Group',
  'Category',
  'LTCite',
  'Cite',
  'Notes',
] as const;

const MONTH_MAP: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export type GcatHeaderAssertionResult =
  | { ok: true }
  | { ok: false; reason: 'no-header' | 'column-mismatch'; details: string };

/**
 * Asserts the GCAT TSV starts with the expected 28-column header. Call
 * this before parsing; a mismatch indicates a GCAT major-version bump
 * that needs operator review per RFC-023 §12.1.
 */
export function assertGcatHeader(tsv: string): GcatHeaderAssertionResult {
  const firstLine = tsv.split('\n', 1)[0];
  if (!firstLine || !firstLine.startsWith('#')) {
    return { ok: false, reason: 'no-header', details: firstLine ?? '(empty)' };
  }
  const cols = firstLine.split('\t');
  if (cols.length !== GCAT_LAUNCH_COLUMNS.length) {
    return {
      ok: false,
      reason: 'column-mismatch',
      details: `expected ${GCAT_LAUNCH_COLUMNS.length} columns, got ${cols.length}`,
    };
  }
  for (let i = 0; i < cols.length; i++) {
    if (cols[i] !== GCAT_LAUNCH_COLUMNS[i]) {
      return {
        ok: false,
        reason: 'column-mismatch',
        details: `column ${i}: expected '${GCAT_LAUNCH_COLUMNS[i]}', got '${cols[i]}'`,
      };
    }
  }
  return { ok: true };
}

/**
 * Parses a GCAT `Launch_Date` field (e.g. `1957 Oct  4 1928:34`,
 * `1969 Jul 16 1332:00`, `1942 Jun 13 1052`) into an ISO 8601 timestamp +
 * the precision GCAT recorded. Returns null when the date is unparsable.
 */
export function parseGcatLaunchDate(
  raw: string,
): { iso: string; precision: LaunchNetPrecision } | null {
  const trimmed = raw.trim();
  // YYYY Mmm DD HHMM:SS  (full precision)
  let m = trimmed.match(/^(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2})(\d{2}):(\d{2})$/);
  if (m) {
    const [, y, mon, d, h, mm, ss] = m;
    const month = MONTH_MAP[mon];
    if (month === undefined) return null;
    const dt = new Date(
      Date.UTC(Number(y), month, Number(d), Number(h), Number(mm), Number(ss)),
    );
    return { iso: dt.toISOString(), precision: 'second' };
  }
  // YYYY Mmm DD HHMM  (minute precision)
  m = trimmed.match(/^(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2})(\d{2})$/);
  if (m) {
    const [, y, mon, d, h, mm] = m;
    const month = MONTH_MAP[mon];
    if (month === undefined) return null;
    const dt = new Date(Date.UTC(Number(y), month, Number(d), Number(h), Number(mm)));
    return { iso: dt.toISOString(), precision: 'minute' };
  }
  // YYYY Mmm DD  (day precision)
  m = trimmed.match(/^(\d{4})\s+([A-Z][a-z]{2})\s+(\d{1,2})$/);
  if (m) {
    const [, y, mon, d] = m;
    const month = MONTH_MAP[mon];
    if (month === undefined) return null;
    const dt = new Date(Date.UTC(Number(y), month, Number(d)));
    return { iso: dt.toISOString(), precision: 'day' };
  }
  // YYYY Mmm  (month precision)
  m = trimmed.match(/^(\d{4})\s+([A-Z][a-z]{2})$/);
  if (m) {
    const [, y, mon] = m;
    const month = MONTH_MAP[mon];
    if (month === undefined) return null;
    const dt = new Date(Date.UTC(Number(y), month, 1));
    return { iso: dt.toISOString(), precision: 'month' };
  }
  // YYYY  (year precision)
  m = trimmed.match(/^(\d{4})$/);
  if (m) {
    const dt = new Date(Date.UTC(Number(m[1]), 0, 1));
    return { iso: dt.toISOString(), precision: 'year' };
  }
  return null;
}

/**
 * Maps a GCAT `LaunchCode` two-letter code to our status enum + a
 * human label. First char buckets the category (O=orbital, S=suborbital,
 * M=mission, A=atmospheric, D=deep-space, Y=test, T=test-orbital);
 * second char buckets the outcome (S=success, F=failure, U=unknown).
 * Suffixes (e.g. OF40, OS75) carry detail we don't surface in the
 * status tag — they're recorded raw in the launch_code field.
 */
export function parseGcatLaunchCode(raw: string): LaunchStatus {
  const code = raw.trim().toUpperCase();
  if (code.length < 2) return { code: 'FAILURE', label: 'Unknown' };
  const outcomeChar = code[1];
  let status: LaunchStatusCode;
  switch (outcomeChar) {
    case 'S':
      status = 'SUCCESS';
      break;
    case 'F':
      status = 'FAILURE';
      break;
    case 'U':
      status = 'FAILURE'; // historic unknown outcomes get the safe bucket
      break;
    default:
      status = 'FAILURE';
  }
  return { code: status, label: code };
}

// Stable-id helpers live in src/lib/launches/id.ts so other sources
// (LL2, NASA, ESA) reuse the same slugification rule. Re-exported here
// for backwards-compat with existing test imports.
export { buildStableId, slugify };

/** Extract the rocket family from `LV_Type` — Saturn V, Falcon 9, etc. */
export function rocketFamilyFromLvType(lv: string): string {
  const trimmed = lv.trim();
  // Pick the first 1-2 words; strip trailing block/variant markers.
  const m = trimmed.match(/^(\S+(?:\s+\S+)?)/);
  return (m?.[1] ?? trimmed).replace(/[-:]?(Block|Mk|V[0-9]).*$/i, '').trim();
}

/**
 * GCAT row → RawLaunchEntry. Returns null when the row can't be parsed
 * (malformed date, missing required fields). The parser is permissive
 * about column whitespace; callers handle the null case.
 */
export function gcatRowToRawEntry(opts: {
  row: string[];
  source_name: string;
  source_observed_at: string;
}): RawLaunchEntry | null {
  const cols = opts.row.map((c) => c.trim());
  const launchTag = cols[0];
  const launchDate = cols[2];
  const lvType = cols[3];
  const mission = cols[7];
  const launchSite = cols[10];
  const launchPad = cols[11];
  const dest = cols[18];
  const agency = cols[20];
  const launchCode = cols[21];
  const category = cols[24];
  const notes = cols[27];

  if (!launchTag || !launchDate || !lvType) return null;

  // The calendar surfaces orbital-class launches only. GCAT's Category
  // field discriminates: 'Sat *' = satellite-bearing launch (orbital);
  // 'Spc', 'Lunar', 'Deep' = beyond-LEO probes. Skip Meteo / Aeron /
  // Test / Weapon etc. that bloat the manifest with non-launch rows.
  const catFirst = category.split(/\s+/)[0];
  const allowed = ['Sat', 'Spc', 'Lunar', 'Deep'];
  if (!allowed.includes(catFirst)) return null;
  const dateRes = parseGcatLaunchDate(launchDate);
  if (!dateRes) return null;
  const status = parseGcatLaunchCode(launchCode);

  const missionName = mission || lvType;
  const rocketFamily = rocketFamilyFromLvType(lvType);
  const id = buildStableId({ iso: dateRes.iso, rocketFamily, missionName });

  return {
    id,
    net: dateRes.iso,
    net_precision: dateRes.precision,
    status,
    name: lvType + (mission ? ` | ${mission}` : ''),
    mission_name: mission || undefined,
    orbit_abbrev: dest || undefined,
    agency_id: agency ? agency.toLowerCase() : undefined,
    agency_name: agency || 'Unknown',
    rocket_config_name: lvType,
    rocket_family: rocketFamily,
    pad_name: launchPad || undefined,
    pad_location: launchSite || undefined,
    image_credit: notes || undefined,
    source_observed_at: opts.source_observed_at,
    source_name: opts.source_name,
  };
}

/**
 * Parse a complete GCAT launch.tsv string. Skips the header + any
 * comment lines starting with `#`. Returns the entries that parsed
 * cleanly + a list of unparsed rows (for the audit report).
 */
export function parseGcatLaunchTsv(opts: {
  tsv: string;
  source_name: string;
  source_observed_at: string;
}): { entries: RawLaunchEntry[]; unparsed: number } {
  const lines = opts.tsv.split('\n');
  const entries: RawLaunchEntry[] = [];
  let unparsed = 0;
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length !== GCAT_LAUNCH_COLUMNS.length) {
      unparsed++;
      continue;
    }
    const entry = gcatRowToRawEntry({
      row: cols,
      source_name: opts.source_name,
      source_observed_at: opts.source_observed_at,
    });
    if (entry) {
      entries.push(entry);
    } else {
      unparsed++;
    }
  }
  return { entries, unparsed };
}
