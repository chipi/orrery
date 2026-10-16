/**
 * Pass criteria for the 2026-10 launch first-flight / GCAT 1.8.8 fix (#566),
 * over the frozen corpus. See README.md.
 *
 *   npx tsx scripts/launches-replay/check.ts                    # new code only
 *   npx tsx scripts/launches-replay/check.ts --baseline <dir>   # + old-vs-new
 *
 * <dir> is a worktree of the commit before the fix. Exits 1 on any failure.
 */
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CORPUS_DIR,
  readLL2Corpus,
  runReplay,
  type LL2Config,
  type ReplayResult,
} from './replay.js';

const FF = 'first-flight-vehicle';
const REPO_ROOT = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const firstFlights = (side: Record<string, { tier_reason: string }>) =>
  Object.entries(side)
    .filter(([, v]) => v.tier_reason === FF)
    .map(([id]) => id);

/**
 * Upcoming first flights must each be a vehicle LL2 says has never flown:
 * not a placeholder, 0 launches, not a generic config whose family has
 * flown — and only the earliest launch of its config. A config the operator
 * listed in launches-curation.json `first_flight_configs` is exempt from the
 * generic-family test only: that list exists for exactly the vehicles whose
 * family count hides a maiden flight (#603).
 */
export function checkNew(
  neu: ReplayResult,
  curationPath = join(REPO_ROOT, 'static/data/launches-curation.json'),
): string[] {
  const fail: string[] = [];
  const configs = new Map<string, LL2Config>();
  for (const r of readLL2Corpus())
    configs.set(String(r.rocket.configuration.id), r.rocket.configuration);
  const curated = new Set<string>(
    (
      JSON.parse(readFileSync(curationPath, 'utf8')) as {
        first_flight_configs?: Array<{ rocket_config_id: string }>;
      }
    ).first_flight_configs?.map((c) => c.rocket_config_id) ?? [],
  );

  if (neu.errors.length > 0) fail.push(`new code: source errors ${JSON.stringify(neu.errors)}`);
  const historic = Object.keys(neu.historic).length;
  if (historic < 7000)
    fail.push(`new code: only ${historic} historic GCAT launches (expected ≥ 7000)`);

  const seenConfig = new Set<string>();
  for (const id of firstFlights(neu.upcoming)) {
    const e = neu.upcoming[id];
    const c = e.rocket_config_id ? configs.get(e.rocket_config_id) : undefined;
    if (!c) {
      fail.push(`${id}: first flight without an LL2 configuration`);
      continue;
    }
    if (c.is_placeholder)
      fail.push(`${id}: first flight on placeholder config ${c.id} ${c.full_name}`);
    if (c.total_launch_count !== 0)
      fail.push(
        `${id}: first flight but config ${c.id} ${c.full_name} has ${c.total_launch_count} launches`,
      );
    const flownFamily = c.families?.find(
      (f) => (f.total_launch_count ?? 0) > 0 && (f.name === c.name || f.name === c.full_name),
    );
    if (flownFamily && !curated.has(String(c.id)))
      fail.push(
        `${id}: first flight but generic config ${c.full_name}'s family has flown ${flownFamily.total_launch_count}×`,
      );
    if (seenConfig.has(String(c.id))) fail.push(`${id}: second first flight for config ${c.id}`);
    seenConfig.add(String(c.id));
    const earlier = Object.entries(neu.upcoming).find(
      ([other, o]) => other !== id && o.rocket_config_id === e.rocket_config_id && o.net < e.net,
    );
    if (earlier) fail.push(`${id}: not the earliest launch of config ${c.id} (${earlier[0]} is)`);
  }
  return fail;
}

/** Old-vs-new: the baseline reproduces prod, history is unchanged, nothing outside first flights moves. */
export function checkAgainstBaseline(
  base: ReplayResult,
  base180: ReplayResult,
  neu: ReplayResult,
): string[] {
  const fail: string[] = [];
  const live = JSON.parse(
    readFileSync(join(CORPUS_DIR, 'live-0928-first-flight.json'), 'utf8'),
  ) as {
    n: number;
    first_flight: string[];
  };

  // Faithful replay: the old code on this corpus reproduces what prod published.
  if (!base.errors.some((e) => e.includes('GCAT header assertion failed')))
    fail.push(
      `baseline: expected the prod GCAT header failure, got ${JSON.stringify(base.errors)}`,
    );
  if (Object.keys(base.upcoming).length !== live.n)
    fail.push(
      `baseline: ${Object.keys(base.upcoming).length} upcoming entries, prod published ${live.n}`,
    );
  const baseFF = firstFlights(base.upcoming).sort();
  const liveFF = [...live.first_flight].sort();
  if (JSON.stringify(baseFF) !== JSON.stringify(liveFF))
    fail.push(`baseline: first flights differ from prod's (${baseFF.length} vs ${liveFF.length})`);

  // History: reading 1.8.8 by header name gives exactly what 1.8.0 positions gave.
  const oldH = base180.historic;
  const newH = neu.historic;
  if (Object.keys(oldH).length !== Object.keys(newH).length)
    fail.push(
      `historic: ${Object.keys(newH).length} entries vs ${Object.keys(oldH).length} from the 1.8.0 projection`,
    );
  for (const [id, n] of Object.entries(newH)) {
    const o = oldH[id];
    if (!o || o.tier !== n.tier || o.tier_reason !== n.tier_reason)
      fail.push(`historic ${id}: ${o?.tier}/${o?.tier_reason} -> ${n.tier}/${n.tier_reason}`);
  }

  // Invariant: only first-flight decisions change in the upcoming manifest.
  for (const [id, n] of Object.entries(neu.upcoming)) {
    const o = base.upcoming[id];
    if (!o) {
      fail.push(`upcoming ${id}: missing from baseline`);
      continue;
    }
    if (o.tier_reason === FF || n.tier_reason === FF) continue;
    if (o.tier !== n.tier || o.tier_reason !== n.tier_reason)
      fail.push(
        `upcoming ${id}: ${o.tier}/${o.tier_reason} -> ${n.tier}/${n.tier_reason} outside first-flight`,
      );
  }
  return fail;
}

/** Replay the working tree (and `baselineDir`, when given) and return the summary + failures. */
export async function runCheck(
  baselineDir?: string,
): Promise<{ summary: string; failures: string[] }> {
  const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));
  const neu = await runReplay(repo);
  const failures = checkNew(neu);
  if (baselineDir) {
    const dir = resolve(baselineDir);
    failures.push(
      ...checkAgainstBaseline(await runReplay(dir), await runReplay(dir, { gcat180: true }), neu),
    );
  }
  const ff = firstFlights(neu.upcoming).length;
  const summary = `new: ${Object.keys(neu.upcoming).length} upcoming (${ff} first flights), ${Object.keys(neu.historic).length} historic`;
  return { summary, failures };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--baseline');
  runCheck(i >= 0 ? process.argv[i + 1] : undefined)
    .then(({ summary, failures }) => {
      console.log(summary);
      for (const f of failures) console.log(`FAIL ${f}`);
      console.log(failures.length === 0 ? 'PASS' : `FAIL (${failures.length})`);
      process.exit(failures.length === 0 ? 0 : 1);
    })
    .catch((e) => {
      console.error(e);
      process.exit(2);
    });
}
