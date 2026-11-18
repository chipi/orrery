import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import dataSources from '$data/data-sources.json';
import { ASTRO_SOURCE_IDS, PLANETARY_SOURCE_IDS, SURFACE_SOURCE_IDS } from './source-ids';

const byId = new Map(dataSources.entries.map((e) => [e.id, e]));
const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf8'));

describe('/library header blocks name real data-sources.json entries', () => {
  it.each([
    ['astro', ASTRO_SOURCE_IDS],
    ['planetary', PLANETARY_SOURCE_IDS],
    ['surface', SURFACE_SOURCE_IDS],
  ])('%s: every id exists, once', (_name, ids) => {
    expect(ids.filter((id) => !byId.has(id))).toEqual([]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('keeps the three blocks apart', () => {
    const all = [...ASTRO_SOURCE_IDS, ...PLANETARY_SOURCE_IDS, ...SURFACE_SOURCE_IDS];
    expect(new Set(all).size).toBe(all.length);
  });

  it('the planetary block is NASA JPL data: an ssd.jpl.nasa.gov page and a licence', () => {
    for (const id of PLANETARY_SOURCE_IDS) {
      const e = byId.get(id)!;
      expect(new URL(e.source_url).hostname, id).toBe('ssd.jpl.nasa.gov');
      expect(e.license_short, id).toBeTruthy();
      expect(e.license_url, id).toMatch(/^https:\/\//);
    }
  });

  it('every surface source carries a licence and a link', () => {
    for (const id of SURFACE_SOURCE_IDS) {
      const e = byId.get(id)!;
      expect(e.license_short, id).toBeTruthy();
      expect(e.source_url, id).toMatch(/^https:\/\//);
    }
  });
});

// The route files credit their sources in a `credit` string; each one that names a published
// source must be a block entry, so /credits and /library list what the routes cite.
const CITED: [RegExp, string][] = [
  [/lroc\.asu\.edu\/geojson/i, 'lroc-nac-traverses'],
  [/Haase et al\. 2019/, 'usgs-apollo17-traverse'],
  [/HiRISE ESP_/, 'hirise-zhurong-traverse'],
  [/MMGIS/, 'nasa-mmgis-rover-traverses'],
  [/Analyst.s Notebook|PDS/, 'pds-mer-traverses'],
  [/Wan W\. et al\. 2014/, 'wan2014-yutu-traverse'],
  [/Vadawale S\. V\. et al\. 2024/, 'vadawale2024-pragyan-stops'],
];

describe('every Moon and Mars traverse credit names a source the page lists', () => {
  for (const dir of ['moon-traverses', 'mars-traverses']) {
    const files = readdirSync(`static/data/${dir}`).filter(
      (f) => f.endsWith('.json') && !/route-(patches|photos)/.test(f),
    );
    it(`${dir}: ${files.length} route files`, () => {
      expect(files.length).toBeGreaterThan(4);
      const unlisted: string[] = [];
      let cited = 0;
      for (const f of files) {
        const credit: string = readJson(`static/data/${dir}/${f}`).credit ?? '';
        const hits = CITED.filter(([re]) => re.test(credit)).map(([, id]) => id);
        // A route with no published source is Orrery's own polyline and must say so.
        if (!hits.length) {
          expect(credit, f).toMatch(/Approximate route: a simplified polyline/);
          continue;
        }
        cited++;
        for (const id of hits) if (!SURFACE_SOURCE_IDS.includes(id)) unlisted.push(`${f} ${id}`);
      }
      expect(cited).toBeGreaterThan(0);
      expect(unlisted).toEqual([]);
    });
  }
});
