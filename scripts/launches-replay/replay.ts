/**
 * Replay the launch tiering over a frozen corpus, using the code under
 * `codeRoot` — a git worktree of the commit before a fix, or the working
 * tree. Mirrors scripts/fetch-launches.ts phases 1–5 for the two sources
 * prod got data from on 2026-10-16 (LL2 upcoming, GCAT historic); NASA,
 * SpaceX and ESA returned nothing that run and are left out.
 *
 * Reads only the corpus: no network, no writes. See README.md.
 */
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CORPUS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'corpus', '2026-10-16');
/** The prod fetch-launches run behind live launches.json (the deploy's prime step). */
export const REPLAY_NOW = new Date('2026-10-16T09:28:53.523Z');

const GCAT_1_8_0_COLUMNS = [
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
];

export type Tiered = { tier: string; tier_reason: string; rocket_config_id?: string; net: string };
export type ReplayResult = {
  errors: string[];
  upcoming: Record<string, Tiered>;
  historic: Record<string, Tiered>;
};

export type LL2Config = {
  id: number;
  name?: string;
  full_name?: string;
  is_placeholder?: boolean;
  total_launch_count?: number | null;
  families?: Array<{ name?: string; total_launch_count?: number | null }>;
};

export function readLL2Corpus(): Array<{ rocket: { configuration: LL2Config } }> {
  return JSON.parse(
    gunzipSync(readFileSync(join(CORPUS_DIR, 'll2-upcoming.json.gz'))).toString('utf8'),
  );
}

/** GCAT rows projected onto the 28 Release 1.8.0 columns, so the pre-1.8.8 parser can read them. */
function projectTo180(tsv: string): string {
  const lines = tsv.split('\n');
  const header = lines[0].split('\t');
  const pick = GCAT_1_8_0_COLUMNS.map((c) => header.indexOf(c));
  if (pick.some((i) => i < 0)) throw new Error('corpus header lacks a 1.8.0 column');
  return lines
    .map((line, n) => {
      if (!line || (n > 0 && line.startsWith('#'))) return line;
      const cols = line.split('\t');
      return cols.length === header.length ? pick.map((i) => cols[i]).join('\t') : line;
    })
    .join('\n');
}

type Source = {
  name: string;
  mode: string;
  defaultRole: string;
  fetchWindow: (w: unknown) => Promise<unknown[]>;
};

export async function runReplay(
  codeRoot: string,
  opts: { gcat180?: boolean } = {},
): Promise<ReplayResult> {
  const lib = (p: string) => import(join(codeRoot, 'src/lib/launches', p));
  const { LL2Source } = await lib('sources/ll2.ts');
  const { GcatSource } = await lib('sources/gcat.ts');
  const { mergeAllContributions } = await lib('merge.ts');
  const tierMod = await lib('tier.ts');
  const curation = JSON.parse(
    readFileSync(join(codeRoot, 'static/data/launches-curation.json'), 'utf8'),
  );

  const ll2Raw = readLL2Corpus();
  let gcatTsv = gunzipSync(readFileSync(join(CORPUS_DIR, 'gcat-launch.tsv.gz'))).toString('utf8');
  if (opts.gcat180) gcatTsv = projectTo180(gcatTsv);

  const upcomingWindow = {
    mode: 'upcoming',
    fromIso: REPLAY_NOW.toISOString(),
    toIso: new Date(REPLAY_NOW.getFullYear() + 5, 11, 31).toISOString(),
  };
  const historicWindow = {
    mode: 'historic',
    fromIso: '1957-01-01T00:00:00.000Z',
    toIso: REPLAY_NOW.toISOString(),
  };

  // Priority order, as fetch-launches sorts it: GCAT (20) before LL2 (90).
  const sources: Source[] = [
    new GcatSource(async () => gcatTsv),
    new LL2Source(async () => ll2Raw),
  ];
  const upcomingContribs: Array<{ entries: unknown[] }> = [];
  const historicContribs: Array<{ entries: unknown[] }> = [];
  const errors: string[] = [];
  const pull = async (s: Source, w: { mode: string }) => {
    try {
      return await s.fetchWindow(w);
    } catch (e) {
      errors.push(`${s.name} (${w.mode}): ${(e as Error).message}`);
      return [];
    }
  };
  for (const s of sources) {
    for (const [w, into] of [
      [upcomingWindow, upcomingContribs],
      [historicWindow, historicContribs],
    ] as const) {
      if (s.mode !== w.mode && s.mode !== 'both') continue;
      const entries = await pull(s, w);
      if (entries.length > 0)
        into.push({ source_name: s.name, default_role: s.defaultRole, entries } as never);
    }
  }

  const { merged: mergedUpcoming } = mergeAllContributions(upcomingContribs);
  const { merged: mergedHistoric } = mergeAllContributions(historicContribs);
  type Merged = Record<string, { entry: { net: string; rocket_config_id?: string } }>;

  // Each tree's own first-flight API: the 2026-10 fix's id set, or the earlier family map.
  const ctx = tierMod.buildFirstFlightIds
    ? {
        firstFlightIds: tierMod.buildFirstFlightIds(
          [...upcomingContribs, ...historicContribs].flatMap((c) => c.entries),
        ),
      }
    : {
        firstFlightByConfig: tierMod.buildFirstFlightMap(
          [
            ...Object.values(mergedUpcoming as Merged),
            ...Object.values(mergedHistoric as Merged),
          ].map((m) => m.entry),
        ),
      };

  const tierAll = (merged: Merged) => {
    const res: Record<string, Tiered> = {};
    for (const [id, m] of Object.entries(merged)) {
      const t = tierMod.computeTier(m.entry, curation, ctx);
      res[id] = {
        tier: t.tier,
        tier_reason: t.tier_reason,
        rocket_config_id: m.entry.rocket_config_id,
        net: m.entry.net,
      };
    }
    return res;
  };

  return { errors, upcoming: tierAll(mergedUpcoming), historic: tierAll(mergedHistoric) };
}
