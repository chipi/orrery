// @vitest-environment jsdom
// Colour maps are sRGB, data maps are NoColorSpace (rule: docs/adr/TA.md composer pipeline;
// the source-level guard is output-step-rule.test.ts). These build the real objects and read
// the tag off every texture by the slot it is plugged into.
import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { buildIssProxyStation } from '$lib/iss-proxy-model';
import { buildTiangongProxyStation } from '$lib/tiangong-proxy-model';
import { buildHullDecal } from '$lib/station-decals';
import { buildSkydome } from './skydome';
import { buildSunLensFlare } from './sun-lens-flare';
import { featherMask } from './feather-mask';
import { heroGold, heroSolar, solarCellTexture } from './hero-materials';
import { stringerRoughness } from './launcher-detail';

const COLOUR_SLOTS = ['map', 'emissiveMap'] as const;
const DATA_SLOTS = ['roughnessMap', 'metalnessMap', 'alphaMap', 'bumpMap', 'normalMap'] as const;

function slotTextures(root: THREE.Object3D): Array<{ slot: string; tex: THREE.Texture }> {
  const out: Array<{ slot: string; tex: THREE.Texture }> = [];
  root.traverse((o) => {
    const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    for (const m of Array.isArray(mat) ? mat : mat ? [mat] : []) {
      const rec = m as unknown as Record<string, THREE.Texture | null | undefined>;
      for (const slot of [...COLOUR_SLOTS, ...DATA_SLOTS]) {
        if (rec[slot]) out.push({ slot, tex: rec[slot]! });
      }
    }
  });
  return out;
}

function expectSlots(root: THREE.Object3D, minColour: number) {
  const found = slotTextures(root);
  const colour = found.filter((f) => (COLOUR_SLOTS as readonly string[]).includes(f.slot));
  expect(colour.length).toBeGreaterThanOrEqual(minColour);
  for (const f of found) {
    const want = (COLOUR_SLOTS as readonly string[]).includes(f.slot)
      ? THREE.SRGBColorSpace
      : THREE.NoColorSpace;
    expect(f.tex.colorSpace, f.slot).toBe(want);
  }
}

describe('texture colour spaces', () => {
  it('ISS proxy: solar-array maps are sRGB', () => {
    expectSlots(buildIssProxyStation(), 1);
  });

  it('Tiangong proxy: solar-array maps are sRGB', () => {
    expectSlots(buildTiangongProxyStation(), 1);
  });

  it('hull decal banner is sRGB', () => {
    expectSlots(buildHullDecal({ text: 'ISS', width: 4, height: 1 }), 1);
  });

  it('skydome map is sRGB', () => {
    expectSlots(buildSkydome().mesh, 1);
  });

  it('sun lens-flare ghosts are sRGB', () => {
    const flare = buildSunLensFlare({ anchor: new THREE.Vector3() });
    const sprites: THREE.Sprite[] = [];
    flare.group.traverse((o) => {
      if (o instanceof THREE.Sprite) sprites.push(o);
    });
    expect(sprites.length).toBeGreaterThan(0);
    for (const s of sprites) expect(s.material.map?.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('hero solar cell texture is sRGB (and survives the clone)', () => {
    expect(solarCellTexture().colorSpace).toBe(THREE.SRGBColorSpace);
    expect(heroSolar().map?.colorSpace).toBe(THREE.SRGBColorSpace);
  });

  it('data maps are NoColorSpace: foil roughness, stringer roughness, feather mask', () => {
    expect(heroGold().roughnessMap?.colorSpace).toBe(THREE.NoColorSpace);
    expect(stringerRoughness().colorSpace).toBe(THREE.NoColorSpace);
    expect(featherMask(0.1).colorSpace).toBe(THREE.NoColorSpace);
  });
});
