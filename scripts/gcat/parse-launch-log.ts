/**
 * Pure-function parser for Jonathan McDowell's GCAT `launch.tsv` (the master
 * launch list at `https://planet4589.org/space/gcat/tsv/launch/launch.tsv`).
 *
 * The TSV is tab-separated with a comment-prefixed header row (`#Launch_Tag\t...`)
 * and a free-text "# Updated YYYY MMM DD HHmm:ss" line. Data rows are as wide
 * as the header (33 fields since Release 1.8.8), frequently padded with spaces.
 * Fields are read by header name, so GCAT adding columns doesn't shift them.
 *
 * GCAT is released CC-BY by J.C. McDowell. PRD-020 / RFC-023 §12.1.
 */
import type {
  LaunchNetPrecision,
  LaunchStatus,
  LaunchStatusCode,
  RawLaunchEntry,
} from '../../src/lib/launches/types.js';
import { buildStableId, slugify } from '../../src/lib/launches/id.js';

/**
 * The 28 columns of the Release 1.8.0 Orbital Launch Log, in 1.8.0 order.
 * Every one must be present in the header by name; other columns are
 * tolerated (1.8.8 inserted Fairing, Perigee, Inc, Azimuth, OrbMass). A
 * renamed or removed column still fails the assertion, so the operator
 * reviews any change that could alter what a field means (RFC-023 §12.1).
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

export type GcatColumn = (typeof GCAT_LAUNCH_COLUMNS)[number];

/** Header position of each required column, plus the row width the header implies. */
export type GcatColumnIndex = { width: number; at: Record<GcatColumn, number> };

/** Release 1.8.0's positional layout — the default for callers that pass bare 28-field rows. */
export const GCAT_1_8_0_INDEX: GcatColumnIndex = {
  width: GCAT_LAUNCH_COLUMNS.length,
  at: Object.fromEntries(GCAT_LAUNCH_COLUMNS.map((c, i) => [c, i])) as Record<GcatColumn, number>,
};

export type GcatHeaderAssertionResult =
  | { ok: true; index: GcatColumnIndex }
  | { ok: false; reason: 'no-header' | 'column-mismatch'; details: string };

/**
 * Asserts the GCAT TSV header carries every required column, each exactly
 * once, and returns where each one sits. Call this before parsing; a
 * missing, renamed or duplicated column needs operator review per
 * RFC-023 §12.1.
 */
export function assertGcatHeader(tsv: string): GcatHeaderAssertionResult {
  const firstLine = tsv.split('\n', 1)[0];
  if (!firstLine || !firstLine.startsWith('#')) {
    return { ok: false, reason: 'no-header', details: firstLine ?? '(empty)' };
  }
  const cols = firstLine.split('\t');
  const missing = GCAT_LAUNCH_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length > 0) {
    return {
      ok: false,
      reason: 'column-mismatch',
      details: `missing column(s) ${missing.map((c) => `'${c}'`).join(', ')} in a ${cols.length}-column header`,
    };
  }
  const duplicated = GCAT_LAUNCH_COLUMNS.filter((c) => cols.indexOf(c) !== cols.lastIndexOf(c));
  if (duplicated.length > 0) {
    return {
      ok: false,
      reason: 'column-mismatch',
      details: `duplicated column(s) ${duplicated.map((c) => `'${c}'`).join(', ')}`,
    };
  }
  const at = Object.fromEntries(GCAT_LAUNCH_COLUMNS.map((c) => [c, cols.indexOf(c)])) as Record<
    GcatColumn,
    number
  >;
  return { ok: true, index: { width: cols.length, at } };
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
    const dt = new Date(Date.UTC(Number(y), month, Number(d), Number(h), Number(mm), Number(ss)));
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
  /** Where each column sits; defaults to Release 1.8.0's 28-field layout. */
  index?: GcatColumnIndex;
}): RawLaunchEntry | null {
  const cols = opts.row.map((c) => c.trim());
  const at = (opts.index ?? GCAT_1_8_0_INDEX).at;
  const launchTag = cols[at['#Launch_Tag']];
  const launchDate = cols[at.Launch_Date];
  const lvType = cols[at.LV_Type];
  const mission = cols[at.Mission];
  const launchSite = cols[at.Launch_Site];
  const launchPad = cols[at.Launch_Pad];
  const dest = cols[at.Dest];
  const agency = cols[at.Agency];
  const launchCode = cols[at.LaunchCode];
  const category = cols[at.Category] ?? '';
  const notes = cols[at.Notes];

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
 * comment lines starting with `#`. Columns are located from the header
 * when it carries every required column; otherwise the 1.8.0 layout is
 * assumed. Returns the entries that parsed cleanly + a count of unparsed
 * rows (for the audit report).
 */
export function parseGcatLaunchTsv(opts: {
  tsv: string;
  source_name: string;
  source_observed_at: string;
}): { entries: RawLaunchEntry[]; unparsed: number } {
  const header = assertGcatHeader(opts.tsv);
  const index = header.ok ? header.index : GCAT_1_8_0_INDEX;
  const lines = opts.tsv.split('\n');
  const entries: RawLaunchEntry[] = [];
  let unparsed = 0;
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const cols = line.split('\t');
    if (cols.length !== index.width) {
      unparsed++;
      continue;
    }
    const entry = gcatRowToRawEntry({
      row: cols,
      source_name: opts.source_name,
      source_observed_at: opts.source_observed_at,
      index,
    });
    if (entry) {
      entries.push(entry);
    } else {
      unparsed++;
    }
  }
  return { entries, unparsed };
}
