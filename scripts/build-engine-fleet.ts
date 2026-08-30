/**
 * build-engine-fleet.ts — generate the `engine` /fleet category from the curated
 * engine registry (src/lib/physics/propulsion/engine-registry.ts, PRD-032).
 *
 * Writes:
 *   - static/data/fleet/engine/<id>.json  (one FleetEntryBase per engine)
 *   - merges engine rows into static/data/fleet/index.json (other categories
 *     untouched, order preserved)
 *   - merges engine ids into static/data/fleet-galleries.json (count 0 until
 *     imagery lands; existing entries untouched)
 *
 * Idempotent: re-run after editing the registry. Editorial text (tagline /
 * description / dispatch) is NOT written here — it lives in i18n-src overlays.
 *
 *   npx tsx scripts/build-engine-fleet.ts
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ENGINE_REGISTRY } from '../src/lib/physics/propulsion/engine-registry';

const FLEET_DIR = 'static/data/fleet';
const ENGINE_DIR = join(FLEET_DIR, 'engine');
mkdirSync(ENGINE_DIR, { recursive: true });

// ── 1. per-engine detail files ──────────────────────────────────────────────
for (const e of ENGINE_REGISTRY) {
  const specs: Record<string, number | string | boolean> = {
    cycle: e.cycle,
    propellant: e.propellant,
    [e.thrustNote === 'vacuum' ? 'thrust_kn_vac' : 'thrust_kn_sl']: e.thrust_kn,
  };
  if (e.isp_vac_s) specs.isp_vac_s = e.isp_vac_s;
  if (e.isp_sl_s) specs.isp_sl_s = e.isp_sl_s;
  if (e.mass_kg) specs.mass_kg = e.mass_kg;

  const entry: Record<string, unknown> = {
    id: e.id,
    name: e.name,
    category: 'engine',
    agency: e.agency,
    country: e.country,
    manufacturer: e.manufacturer,
    first_flight: e.first_flight,
    ...(e.last_flight ? { last_flight: e.last_flight } : {}),
    status: e.status,
    era: e.era,
    epoch: e.epoch,
    best_known_for: e.best_known_for,
    specs,
    ...(e.science?.length ? { science: e.science } : {}),
    credit: e.credit,
    links: e.links,
  };
  writeFileSync(join(ENGINE_DIR, `${e.id}.json`), JSON.stringify(entry, null, 2) + '\n');
}

// ── 2. merge into fleet/index.json (preserve non-engine rows + order) ────────
const indexPath = join(FLEET_DIR, 'index.json');
type IndexRow = { id: string; category: string; [k: string]: unknown };
const index: IndexRow[] = JSON.parse(readFileSync(indexPath, 'utf8'));
const nonEngine = index.filter((r) => r.category !== 'engine');
const engineRows = ENGINE_REGISTRY.map((e) => ({
  id: e.id,
  name: e.name,
  category: 'engine',
  agency: e.agency,
  country: e.country,
  era: e.era,
  epoch: e.epoch,
  status: e.status,
  first_flight: e.first_flight,
  tagline: e.best_known_for,
})).sort((a, b) => a.id.localeCompare(b.id));
writeFileSync(indexPath, JSON.stringify([...nonEngine, ...engineRows], null, 2) + '\n');

// ── 3. merge into fleet-galleries.json (count 0 until imagery) ───────────────
const galPath = join('static/data', 'fleet-galleries.json');
const gal: Record<string, number> = JSON.parse(readFileSync(galPath, 'utf8'));
let added = 0;
for (const e of ENGINE_REGISTRY) {
  if (!(e.id in gal)) {
    gal[e.id] = 0;
    added++;
  }
}
writeFileSync(galPath, JSON.stringify(gal, null, 2) + '\n');

console.log(
  `✓ ${ENGINE_REGISTRY.length} engine fleet entries → ${ENGINE_DIR}; ` +
    `index.json merged (${nonEngine.length} other + ${engineRows.length} engine); ` +
    `+${added} gallery stubs`,
);
