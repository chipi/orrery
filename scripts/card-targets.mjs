/**
 * Card target enumeration (#547) — the single source of truth for "which
 * canonical card exists for which entity" and "which /c/ share stubs are
 * prerendered". Mirrors the scripts/site-routes.mjs pattern (one enumerator,
 * many consumers) so the sets can never drift apart:
 *
 *   1. scripts/cards/generate-card-images.mjs — render targets + hash inputs
 *   2. src/routes/c/[kind]/[id]/+page.server.ts — stub entries + alias lookup
 *   3. scripts/validate-data.ts — published-corpus parity gate
 *
 * The alias rules here are the enumeration-side twin of the runtime helpers
 * in src/lib/cards/card-spec.ts (fleetAliasesMission / siteAliasMissionId) —
 * change them together.
 */
import { readFileSync } from 'node:fs';

/**
 * @typedef {{ kind: string, id: string, dataPaths: string[] }} CardTarget
 * @typedef {{ kind: string, id: string, canonicalMission: string }} AliasStub
 */

/** @param {string} p */
const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'));

/**
 * One render target per CANONICAL card. Fleet entries that share their id
 * with a mission (Perseverance etc.) are the SAME real thing — their
 * canonical card is mission/<id>; sites alias by mission_id-or-id-parity.
 * `dataPaths` are the per-target content files the generator hashes.
 * @returns {CardTarget[]}
 */
export function canonicalCardTargets() {
  /** @type {Array<{id: string, dest: string}>} */
  const missions = readJson('static/data/missions/index.json');
  /** @type {Array<{id: string, category: string}>} */
  const fleet = readJson('static/data/fleet/index.json');
  const missionIds = new Set(missions.map((mi) => mi.id));
  // Fleet↔mission ids drift on dashes ('change-4' vs 'change4') — the
  // canonical-owner test is dash-normalized (twin of card-spec
  // fleetAliasMissionId; change together).
  const normalizedMissionIds = new Set(missions.map((mi) => mi.id.replace(/-/g, '')));
  /** @param {string} body @returns {CardTarget[]} */
  const siteTargets = (body) =>
    /** @type {Array<{id: string, mission_id?: string}>} */ (
      readJson(`static/data/${body}-sites.json`)
    )
      .filter((s) => !missionIds.has(s.mission_id ?? '') && !missionIds.has(s.id))
      .map((s) => ({
        kind: `${body}-site`,
        id: s.id,
        dataPaths: [`static/data/${body}-sites.json`, `i18n-src/en-US/${body}-sites/${s.id}.json`],
      }));
  return [
    ...missions.map((mi) => {
      const destLower = mi.dest.toLowerCase();
      return {
        kind: 'mission',
        id: mi.id,
        dataPaths: [
          `static/data/missions/${destLower}/${mi.id}.json`,
          `i18n-src/en-US/missions/${destLower}/${mi.id}.json`,
        ],
      };
    }),
    ...fleet
      .filter((fi) => !normalizedMissionIds.has(fi.id.replace(/-/g, '')))
      .map((fi) => ({
        kind: 'fleet',
        id: fi.id,
        dataPaths: [
          `static/data/fleet/${fi.category}/${fi.id}.json`,
          `i18n-src/en-US/fleet/${fi.category}/${fi.id}.json`,
        ],
      })),
    ...siteTargets('moon'),
    ...siteTargets('mars'),
    // Planets (Pluto's canonical card is the small-body kind — its /explore
    // panel is the SmallBodyPanel) + natural satellites + small bodies.
    .../** @type {{planets: Array<{name: string}>}} */ (
      readJson('static/data/planets.json')
    ).planets
      .map((p) => p.name.toLowerCase())
      .filter((id) => id !== 'pluto')
      .map((id) => ({
        kind: 'planet',
        id,
        dataPaths: ['static/data/planets.json', `i18n-src/en-US/planets/${id}.json`],
      })),
    .../** @type {{satellites: Array<{id: string}>}} */ (
      readJson('static/data/satellites.json')
    ).satellites.map((s) => ({
      kind: 'moon',
      id: s.id,
      dataPaths: ['static/data/satellites.json', `i18n-src/en-US/satellites/${s.id}.json`],
    })),
    .../** @type {{bodies: Array<{id: string}>}} */ (
      readJson('static/data/small-bodies.json')
    ).bodies.map((b) => ({
      kind: 'small-body',
      id: b.id,
      dataPaths: ['static/data/small-bodies.json', `i18n-src/en-US/small-bodies/${b.id}.json`],
    })),
  ];
}

/**
 * Alias stubs — entities whose CANONICAL card lives under mission/<id> but
 * whose own /c/<kind>/<id> URL must stay live (link permanence): a fleet
 * entry or site can BECOME mission-aliased between builds when a mission
 * with a colliding id lands, and a stub URL someone shared must not rot on
 * ordinary data growth. Each alias stub serves the canonical mission's OG
 * payload under the alias URL.
 * @returns {AliasStub[]}
 */
export function aliasStubTargets() {
  /** @type {Array<{id: string}>} */
  const missions = readJson('static/data/missions/index.json');
  const missionIds = new Set(missions.map((mi) => mi.id));
  const byNormalized = new Map(missions.map((mi) => [mi.id.replace(/-/g, ''), mi.id]));
  const fleetAliases = /** @type {Array<{id: string}>} */ (readJson('static/data/fleet/index.json'))
    .filter((fi) => byNormalized.has(fi.id.replace(/-/g, '')))
    .map((fi) => ({
      kind: 'fleet',
      id: fi.id,
      canonicalMission: /** @type {string} */ (byNormalized.get(fi.id.replace(/-/g, ''))),
    }));
  const siteAliases = ['moon', 'mars'].flatMap((body) =>
    /** @type {Array<{id: string, mission_id?: string}>} */ (
      readJson(`static/data/${body}-sites.json`)
    )
      .filter((s) => missionIds.has(s.mission_id ?? '') || missionIds.has(s.id))
      .map((s) => ({
        kind: `${body}-site`,
        id: s.id,
        canonicalMission: /** @type {string} */ (
          missionIds.has(s.mission_id ?? '') ? s.mission_id : s.id
        ),
      })),
  );
  return [...fleetAliases, ...siteAliases];
}

/**
 * Every /c/<kind>/<id> stub to prerender: canonical cards + alias stubs.
 * @returns {Array<{kind: string, id: string}>}
 */
export function stubEntries() {
  return [
    ...canonicalCardTargets().map(({ kind, id }) => ({ kind, id })),
    ...aliasStubTargets().map(({ kind, id }) => ({ kind, id })),
  ];
}
