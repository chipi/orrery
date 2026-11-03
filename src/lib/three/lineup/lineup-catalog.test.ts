// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as THREE from 'three';
import { buildLineupCatalog, launcherModelFor, type LineupEntry } from './lineup-catalog';
import { normalise } from './lineup-scene';
import { buildLauncherModel } from '../launcher-models';

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
