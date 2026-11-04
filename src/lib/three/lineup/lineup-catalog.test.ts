// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { buildLineupCatalog, launcherModelFor, type LineupEntry } from './lineup-catalog';
import { normalise } from './lineup-scene';
import { buildLauncherModel } from '../launcher-models';
import type { ShowcaseModel } from '../showcase/types';

const FLEET = join(process.cwd(), 'static/data/fleet');
const load = (cat: string): LineupEntry[] =>
  readdirSync(join(FLEET, cat))
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(FLEET, cat, f), 'utf8')) as LineupEntry);

describe('launcher line-up catalog', () => {
  const launchers = load('launcher');
  const { items, missing } = buildLineupCatalog('launchers', launchers);

  it('accounts for every fleet launcher: drawn, or listed with the reason it is not', () => {
    expect(items.length + missing.length).toBe(launchers.length);
  });

  it('draws every launcher that has a model at its sourced height', () => {
    // A modelled launcher without a size is a data gap: add `specs.height_m` with its source.
    expect(missing.filter((m) => m.reason === 'no-size')).toEqual([]);
    for (const it of items) expect(it.heightM).toBeGreaterThan(10);
  });

  it('carries a source link for each sourced height', () => {
    for (const e of launchers.filter((l) => launcherModelFor(l.id))) {
      const links = (e as unknown as { links?: { u: string }[] }).links ?? [];
      expect(links.length, e.id).toBeGreaterThan(0);
    }
  });

  it('is ordered tallest first', () => {
    const h = items.map((i) => i.heightM);
    expect(h).toEqual([...h].sort((a, b) => b - a));
  });
});

describe('true-scale normalisation', () => {
  it('draws a model at its real height, so ratios between craft are the real ratios', () => {
    const saturn = buildLauncherModel('saturn-v', 1, 0).root;
    const falcon = buildLauncherModel('falcon-9', 1, 0).root;
    const a = normalise(saturn, 111);
    const b = normalise(falcon, 70);
    expect(a.h).toBeCloseTo(111, 6);
    expect(b.h).toBeCloseTo(70, 6);
    expect(a.h / b.h).toBeCloseTo(111 / 70, 6);
  });

  it('stands the model on the ground line, centred', () => {
    const m = buildLauncherModel('soyuz', 1, 0).root;
    normalise(m, 50.7);
    const box = new THREE.Box3().setFromObject(m);
    expect(box.min.y).toBeCloseTo(0, 6);
    expect((box.min.x + box.max.x) / 2).toBeCloseTo(0, 6);
  });

  it('fits a sphere by its diameter when asked', () => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12)));
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1, 0.1));
    stalk.position.y = 1.5;
    g.add(stalk);
    const r = normalise(g, 2.3, true);
    expect(r.w).toBeCloseTo(2.3, 6);
    expect(r.h).toBeGreaterThan(2.3);
  });
});

describe('capsule and spacecraft line-up catalog', () => {
  const spacecraft = [...load('crewed-spacecraft'), ...load('cargo-spacecraft')];
  const { items, missing } = buildLineupCatalog('spacecraft', spacecraft);

  it('draws every crewed and cargo craft (the sister orbiters as one)', () => {
    expect(missing).toEqual([]);
    // atlantis, challenger, discovery and endeavour are drawn as the one space-shuttle-orbiter.
    expect(items.length).toBe(spacecraft.length - 4);
    expect(items.find((i) => i.id === 'space-shuttle-orbiter')?.members).toEqual([
      'atlantis',
      'challenger',
      'discovery',
      'endeavour',
    ]);
  });
});

describe('showcase models', () => {
  const mods = import.meta.glob<{ SHOWCASE?: Record<string, ShowcaseModel> }>('../showcase/*.ts', {
    eager: true,
  });
  const all = Object.assign({}, ...Object.values(mods).map((m) => m.SHOWCASE ?? {})) as Record<
    string,
    ShowcaseModel
  >;
  const fleet = new Map(
    readdirSync(FLEET, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .flatMap((d) => load(d.name))
      .map((e) => [e.id, e]),
  );

  it('are keyed by fleet ids', () => {
    for (const id of Object.keys(all)) expect(fleet.has(id), id).toBe(true);
  });

  it('draw at the fleet entry’s sourced length, base on the ground', () => {
    for (const [id, m] of Object.entries(all)) {
      const g = m.build();
      const box = new THREE.Box3().setFromObject(g);
      const spec = fleet.get(id)?.specs?.length_m;
      expect(typeof spec, id).toBe('number');
      expect(
        Math.abs(box.max.y - box.min.y - (spec as number)) / (spec as number),
        id,
      ).toBeLessThan(0.01);
      expect(Math.abs(box.min.y), id).toBeLessThan(0.05);
    }
  });
});
