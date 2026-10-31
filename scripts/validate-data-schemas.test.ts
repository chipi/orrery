/**
 * Mutation proof for the schemas that cover the formerly-unvalidated
 * static/data manifests (galleries, hero overrides, image-source ledgers,
 * orbit regimes, traverses, site stories, …).
 *
 * Each case takes a REAL data file, asserts it validates, breaks it in one way
 * the schema must catch, and asserts validation fails at the expected
 * instancePath with a readable message. Ajv options mirror validate-data.ts.
 */
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Hand-built mutations poke arbitrary shapes; typing them would just restate the schemas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

const DATA = 'static/data';
const ajv = new Ajv({ allErrors: true, strict: true, strictRequired: false });
addFormats(ajv);

const read = (rel: string): Doc => JSON.parse(readFileSync(join(DATA, rel), 'utf8'));
const compiled = new Map<string, ValidateFunction>();
const compile = (schema: string): ValidateFunction => {
  let v = compiled.get(schema);
  if (!v) compiled.set(schema, (v = ajv.compile(read(`schemas/${schema}`))));
  return v;
};

interface Case {
  name: string;
  schema: string;
  file: string;
  /** Break the (already cloned) document in place, or return a replacement. */
  mutate: (d: Doc) => Doc;
  /** instancePath the failure must be reported at. */
  path: string;
  message: RegExp;
}

const first = (o: Record<string, unknown>) => Object.keys(o)[0];

const CASES: Case[] = [
  {
    name: 'gallery-counts: count becomes a string',
    schema: 'gallery-counts.schema.json',
    file: 'belt-galleries.json',
    mutate: (d) => {
      d[first(d)] = '5';
      return d;
    },
    path: '/asteroid',
    message: /must be integer/,
  },
  {
    name: 'gallery-counts: negative count',
    schema: 'gallery-counts.schema.json',
    file: 'iss-galleries.json',
    mutate: (d) => {
      d[first(d)] = -1;
      return d;
    },
    path: '/beam',
    message: /must be >= 0/,
  },
  {
    name: 'sun-gallery: count dropped',
    schema: 'sun-gallery.schema.json',
    file: 'sun-gallery.json',
    mutate: (d) => {
      delete d.count;
      return d;
    },
    path: '/',
    message: /must have required property 'count'/,
  },
  {
    name: 'hero-overrides: slot dropped',
    schema: 'hero-overrides.schema.json',
    file: 'fleet-hero-overrides.json',
    mutate: (d) => {
      delete d.overrides[first(d.overrides)].slot;
      return d;
    },
    path: '/overrides/apollo-csm-block-ii',
    message: /must have required property 'slot'/,
  },
  {
    name: 'hero-overrides: slot is not NN.jpg',
    schema: 'hero-overrides.schema.json',
    file: 'missions-hero-overrides.json',
    mutate: (d) => {
      d.overrides[first(d.overrides)].slot = 'hero.png';
      return d;
    },
    path: '/overrides/voyager-2/slot',
    message: /must match pattern/,
  },
  {
    name: 'image-sources: malformed slot key',
    schema: 'image-sources.schema.json',
    file: 'fleet-image-sources.json',
    mutate: (d) => {
      d['Bad Key'] = d[first(d)];
      return d;
    },
    path: '/',
    message: /property name must be valid/,
  },
  {
    name: 'image-sources: credit becomes a number',
    schema: 'image-sources.schema.json',
    file: 'mission-image-sources.json',
    mutate: (d) => {
      d[first(d)].credit = 5;
      return d;
    },
    path: `/${first(read('mission-image-sources.json')).replaceAll('/', '~1')}/credit`,
    message: /must be string/,
  },
  {
    name: 'image-sources: empty record',
    schema: 'image-sources.schema.json',
    file: 'panel-image-sources.json',
    mutate: (d) => {
      d[first(d)] = {};
      return d;
    },
    path: `/${first(read('panel-image-sources.json')).replaceAll('/', '~1')}`,
    message: /must NOT have fewer than 1 properties/,
  },
  {
    name: 'deep-sky-image-sources: license dropped',
    schema: 'deep-sky-image-sources.schema.json',
    file: 'deep-sky-image-sources.json',
    mutate: (d) => {
      delete d[first(d)].license;
      return d;
    },
    path: `/${first(read('deep-sky-image-sources.json'))}`,
    message: /must have required property 'license'/,
  },
  {
    name: 'badge-sources: kind outside the enum',
    schema: 'badge-sources.schema.json',
    file: 'badge-sources.json',
    mutate: (d) => {
      d[0].kind = 'patch';
      return d;
    },
    path: '/0/kind',
    message: /must be equal to one of the allowed values/,
  },
  {
    name: 'badge-provenance: path outside /images/badges',
    schema: 'badge-provenance.schema.json',
    file: 'badge-provenance.json',
    mutate: (d) => {
      d[0].path = '/etc/passwd';
      return d;
    },
    path: '/0/path',
    message: /must match pattern/,
  },
  {
    name: 'orbit-regimes: color dropped',
    schema: 'orbit-regimes.schema.json',
    file: 'orbit-regimes.json',
    mutate: (d) => {
      delete d[0].color;
      return d;
    },
    path: '/0',
    message: /must have required property 'color'/,
  },
  {
    name: 'orbit-regimes: altitude is a string',
    schema: 'orbit-regimes.schema.json',
    file: 'orbit-regimes-moon.json',
    mutate: (d) => {
      d[0].altitude_km = 'high';
      return d;
    },
    path: '/0/altitude_km',
    message: /must be number|must be array|must match exactly one schema in oneOf/,
  },
  {
    name: 'orbit-regimes-explore: distance_au dropped',
    schema: 'orbit-regimes-explore.schema.json',
    file: 'orbit-regimes-explore.json',
    mutate: (d) => {
      delete d[0].distance_au;
      return d;
    },
    path: '/0',
    message: /must have required property 'distance_au'/,
  },
  {
    name: 'local-group-galaxies: declination out of range',
    schema: 'local-group-galaxies.schema.json',
    file: 'local-group-galaxies.json',
    mutate: (d) => {
      d.entries[0].dec = 123;
      return d;
    },
    path: '/entries/0/dec',
    message: /must be <= 90/,
  },
  {
    name: 'explore-orbiters: status outside the enum',
    schema: 'explore-orbiters.schema.json',
    file: 'explore-orbiters.json',
    mutate: (d) => {
      d.orbiters[0].status = 'LOST';
      return d;
    },
    path: '/orbiters/0/status',
    message: /must be equal to one of the allowed values/,
  },
  {
    name: 'station-tles: line1 truncated',
    schema: 'station-tles.schema.json',
    file: 'station-tles.json',
    mutate: (d) => {
      d.iss.line1 = d.iss.line1.slice(0, 40);
      return d;
    },
    path: '/iss/line1',
    message: /must match pattern/,
  },
  {
    name: 'lab-illustrations: altKey dropped',
    schema: 'lab-illustrations.schema.json',
    file: 'lab-illustrations.json',
    mutate: (d) => {
      delete d[0].altKey;
      return d;
    },
    path: '/0',
    message: /must have required property 'altKey'/,
  },
  {
    name: 'lab-illustration-provenance: operator_approved is not a date-time',
    schema: 'lab-illustration-provenance.schema.json',
    file: 'lab-illustration-provenance.json',
    mutate: (d) => {
      d.records[0].operator_approved = 'yesterday';
      return d;
    },
    path: '/records/0/operator_approved',
    message: /must match format "date-time"/,
  },
  {
    name: 'original-work: totals dropped',
    schema: 'original-work.schema.json',
    file: 'original-work.json',
    mutate: (d) => {
      delete d.totals;
      return d;
    },
    path: '/',
    message: /must have required property 'totals'/,
  },
  {
    name: 'original-work: poster loses its thumb',
    schema: 'original-work.schema.json',
    file: 'original-work.json',
    mutate: (d) => {
      delete d.posters[0].thumb;
      return d;
    },
    path: '/posters/0',
    message: /must have required property 'thumb'/,
  },
  {
    name: 'agency-archives: tier_3_failover dropped',
    schema: 'agency-archives.schema.json',
    file: 'agency-archives.json',
    mutate: (d) => {
      delete d.tier_3_failover;
      return d;
    },
    path: '/',
    message: /must have required property 'tier_3_failover'/,
  },
  {
    name: 'agency-archives: agency loses its primaries',
    schema: 'agency-archives.schema.json',
    file: 'agency-archives.json',
    mutate: (d) => {
      delete d.tier_1_agencies.NASA.primaries;
      return d;
    },
    path: '/tier_1_agencies/NASA',
    message: /must have required property 'primaries'/,
  },
  {
    name: 'source-fetch-provenance: license_url dropped',
    schema: 'source-fetch-provenance.schema.json',
    file: 'source-fetch-provenance.json',
    mutate: (d) => {
      delete d[0].license_url;
      return d;
    },
    path: '/0',
    message: /must have required property 'license_url'/,
  },
  {
    name: 'cislunar-phase-science-map: ref loses its slug',
    schema: 'cislunar-phase-science-map.schema.json',
    file: 'cislunar-phase-science-map.json',
    mutate: (d) => {
      delete d.phase_refs.parking[0].slug;
      return d;
    },
    path: '/phase_refs/parking/0',
    message: /must have required property 'slug'/,
  },
  {
    name: 'traverse: latitude out of range',
    schema: 'traverse.schema.json',
    file: 'mars-traverses/curiosity.json',
    mutate: (d) => {
      d.points[0] = [95, 137.4];
      return d;
    },
    path: '/points/0/0',
    message: /must be <= 90/,
  },
  {
    name: 'traverse: status outside the enum',
    schema: 'traverse.schema.json',
    file: 'moon-traverses/apollo17.json',
    mutate: (d) => {
      d.status = 'LOST';
      return d;
    },
    path: '/status',
    message: /must be equal to one of the allowed values/,
  },
  {
    name: 'traverse-route-patches: longitude out of range',
    schema: 'traverse-route-patches.schema.json',
    file: 'mars-traverses/curiosity.route-patches.json',
    mutate: (d) => {
      d.patches[0].lon = 200;
      return d;
    },
    path: '/patches/0/lon',
    message: /must be <= 180/,
  },
  {
    name: 'launches-historic (launch.schema.json): net_precision dropped',
    schema: 'launch.schema.json',
    file: 'launches-historic/1957-1969.json',
    mutate: (d) => {
      delete d.entries[first(d.entries)].net_precision;
      return d;
    },
    path: `/entries/${first(read('launches-historic/1957-1969.json').entries)}`,
    message: /must have required property 'net_precision'/,
  },
  {
    name: 'site-story: image caption dropped',
    schema: 'site-story.schema.json',
    file: 'site-stories/apollo11.json',
    mutate: (d) => {
      delete d.chapters[0].images[0].caption;
      return d;
    },
    path: '/chapters/0/images/0',
    message: /must have required property 'caption'/,
  },
  {
    name: 'site-stories-index: id is not a string',
    schema: 'site-stories-index.schema.json',
    file: 'site-stories/index.json',
    mutate: (d) => {
      d.ids[0] = 11;
      return d;
    },
    path: '/ids/0',
    message: /must be string/,
  },
];

function describeErrors(errors: ErrorObject[] | null | undefined): string {
  return (errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message}`).join('; ');
}

describe('formerly-unvalidated data manifests: real files pass, mutations are caught', () => {
  for (const c of CASES) {
    it(c.name, () => {
      const validate = compile(c.schema);
      const real = read(c.file);
      expect(
        validate(real),
        `${c.file} should pass ${c.schema}: ${describeErrors(validate.errors)}`,
      ).toBe(true);

      const broken = c.mutate(structuredClone(real));
      expect(validate(broken), `${c.file} mutated should FAIL ${c.schema}`).toBe(false);
      const hit = (validate.errors ?? []).find(
        (e) => (e.instancePath || '/') === c.path && c.message.test(e.message ?? ''),
      );
      expect(
        hit,
        `expected ${c.path} ${c.message}; got: ${describeErrors(validate.errors)}`,
      ).toBeDefined();
    });
  }

  it('site-story accepts the deliberate null stub (23 sites have no story yet)', () => {
    const validate = compile('site-story.schema.json');
    expect(validate(read('site-stories/artemis4.json'))).toBe(true);
    expect(validate({ site: 'x' })).toBe(false);
  });

  it('original-work totals mirror the section array lengths', () => {
    const d = read('original-work.json');
    for (const [section, n] of Object.entries(d.totals)) {
      expect(d[section].length, `totals.${section}`).toBe(n);
    }
  });
});

describe('wiring: every new schema is loaded by validate-data.ts', () => {
  const src = readFileSync('scripts/validate-data.ts', 'utf8');
  const schemas = [...new Set(CASES.map((c) => c.schema))].filter(
    (s) => s !== 'launch.schema.json',
  );
  for (const s of schemas) {
    it(`loads ${s}`, () => {
      expect(src).toContain(`'${s}'`);
    });
  }
  it('applies the launch schema to launches-historic/', () => {
    expect(src).toMatch(/launches-historic[\s\S]{0,200}validateLaunches/);
  });
});
