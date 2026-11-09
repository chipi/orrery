import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(process.cwd(), 'static/data/missions');

interface Ev {
  type?: string;
  met_days?: number | null;
  label?: string;
}

const missions: { id: string; events: Ev[] }[] = [];
for (const d of readdirSync(ROOT, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  for (const f of readdirSync(join(ROOT, d.name))) {
    if (!f.endsWith('.json') || f === 'index.json') continue;
    const m = JSON.parse(readFileSync(join(ROOT, d.name, f), 'utf8')) as {
      id: string;
      flight?: { events?: Ev[] };
    };
    if (m.flight?.events?.length) missions.push({ id: m.id, events: m.flight.events });
  }
}

// Only events labelled TCM-n (mid-course corrections; perigee-raise and return-cruise burns are also typed tcm and may sit elsewhere). A mid-course correction corrects the trajectory a departure burn set: it comes after the
// trans-lunar / trans-Mars injection and before the arrival or orbit-insertion event. Chandrayaan-1's
// TCM events sat before its (mis-dated) TLI.
describe('mission events: mid-course corrections fall between departure and arrival', () => {
  it('covers the catalogue', () => {
    expect(missions.length).toBeGreaterThan(50);
  });
  for (const m of missions) {
    const tcms = m.events.filter((e) => e.type === 'tcm' && /^TCM/i.test(e.label ?? '') && typeof e.met_days === 'number');
    if (!tcms.length) continue;
    it(`${m.id}: every TCM is after the injection burn and before arrival`, () => {
      const tli = m.events.find((e) => e.type === 'tli_or_tmi' && typeof e.met_days === 'number');
      const arrivals = m.events
        .filter((e) => (e.type === 'arrival' || e.type === 'edl_or_oi') && typeof e.met_days === 'number')
        .map((e) => e.met_days as number);
      const arrival = arrivals.length ? Math.min(...arrivals) : Infinity;
      for (const t of tcms) {
        const met = t.met_days as number;
        if (tli) expect(met, `${m.id} ${t.label} at ${met} is not after TLI/TMI at ${tli.met_days}`).toBeGreaterThan(tli.met_days as number);
        expect(met, `${m.id} ${t.label} at ${met} is not before arrival at ${arrival}`).toBeLessThanOrEqual(arrival);
      }
    });
  }
});
