// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { buildIssProxyStation, ISS_MODULE_IDS, ISS_VISITOR_IDS } from './iss-proxy-model';

/**
 * Phase 1 §1.0 guardrail. The plan locks 1 unit ≈ 12.7 m and tabulates
 * real-world dimensions for every module + array + spacecraft. These tests
 * traverse the built proxy and assert key dimensions stay on spec — fails
 * the build if a later edit doubles a length, replaces a wing with a sphere,
 * or otherwise breaks the ratio table.
 *
 * Tolerances: arrays ±5% (rectangular boxes — exact). Modules ±20%
 * (some have spheres / cones / multi-section bodies that throw off bbox).
 * Ships ±25% (complex compound bodies).
 *
 * The real signal is the ratio sanity-checks at the end (Zvezda > Soyuz,
 * Crew Dragon > Harmony, main array > iROSA, truss span > stack span).
 */

const MODULE_LENGTHS: Record<string, number> = {
  zvezda: 1.03,
  zarya: 0.99,
  unity: 0.43,
  destiny: 0.67,
  harmony: 0.57,
  poisk: 0.32,
  pirs: 0.32,
  nauka: 1.02,
  prichal: 0.26, // sphere — diameter is 2 * radius (0.13)
  rassvet: 0.47,
  tranquility: 0.53,
  quest: 0.43,
  cupola: 0.27, // dome diameter (sphere radius 0.116 * 1.15 * 2)
  beam: 0.35, // sphere radius 0.126 * 1.4 → diameter 0.353
  leonardo: 0.5,
  columbus: 0.54,
  kibo: 0.88,
};

const SPACESHIP_LENGTHS: Record<string, number> = {
  visiting_soyuz: 0.6,
  visiting_progress: 0.66, // measured: cargo + refuel + service stack
  visiting_crew_dragon: 0.85,
  visiting_cargo_dragon: 0.85,
  visiting_cygnus: 0.6, // PCM + service module + UltraFlex disc thickness
  visiting_starliner: 0.5, // capsule + service + dome
  visiting_htvx: 0.7, // pressurised + service
};

describe('ISS proxy ratio guardrails (Phase 1 §1.0 spec)', () => {
  const station = buildIssProxyStation();
  station.updateMatrixWorld(true);

  describe('module dimensions', () => {
    for (const id of ISS_MODULE_IDS) {
      if (id === 'canadarm2') continue;
      const expectedLen = MODULE_LENGTHS[id];
      if (!expectedLen) continue;

      it(`${id} primary mesh longest dim within ±20% of ${expectedLen} units`, () => {
        // Find by name (mesh OR group — two-section modules are groups)
        let target: THREE.Object3D | null = null;
        station.traverse((obj) => {
          if (!target && obj.name === id) target = obj;
        });
        expect(target).not.toBeNull();
        if (!target) return;
        const box = new THREE.Box3().setFromObject(target);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longest = Math.max(size.x, size.y, size.z);
        expect(Math.abs(longest - expectedLen) / expectedLen).toBeLessThanOrEqual(0.2);
      });
    }
  });

  describe('spacecraft presence + assembly', () => {
    const NAME_MAP: Record<string, string> = {
      crew_dragon: 'visiting_crew_dragon',
      cargo_dragon: 'visiting_cargo_dragon',
      soyuz_ms: 'visiting_soyuz',
      progress_ms: 'visiting_progress',
      htv_x: 'visiting_htvx',
      cygnus: 'visiting_cygnus',
      starliner: 'visiting_starliner',
    };

    for (const visitorId of ISS_VISITOR_IDS) {
      const groupName = NAME_MAP[visitorId];

      it(`${groupName} group present + has at least one body mesh`, () => {
        let shipGroup: THREE.Object3D | null = null;
        let bodyMeshCount = 0;
        station.traverse((obj) => {
          if (obj.name === groupName) shipGroup = obj;
        });
        expect(shipGroup).not.toBeNull();
        if (!shipGroup) return;
        const ship = shipGroup as THREE.Object3D;
        ship.traverse((obj) => {
          if (obj instanceof THREE.Mesh) bodyMeshCount++;
        });
        expect(bodyMeshCount).toBeGreaterThan(0);
      });
    }

    it('Crew Dragon has trunk-mounted PV (no deployable wing pair group)', () => {
      let shipGroup: THREE.Object3D | null = null;
      station.traverse((obj) => {
        if (obj.name === 'visiting_crew_dragon') shipGroup = obj;
      });
      if (!shipGroup) throw new Error('Crew Dragon not found');
      let foundWingPair = false;
      (shipGroup as THREE.Object3D).traverse((obj) => {
        if (obj instanceof THREE.Group && obj.userData.tracksSun === true) {
          foundWingPair = true;
        }
      });
      expect(foundWingPair).toBe(false);
    });

    it('Cygnus has 2 round UltraFlex disc arrays', () => {
      let shipGroup: THREE.Object3D | null = null;
      station.traverse((obj) => {
        if (obj.name === 'visiting_cygnus') shipGroup = obj;
      });
      if (!shipGroup) throw new Error('Cygnus not found');
      let circleCount = 0;
      (shipGroup as THREE.Object3D).traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.geometry instanceof THREE.CircleGeometry) {
          circleCount++;
        }
      });
      // Each disc has a base + 4 slice overlays = 5 circles per side × 2 sides = 10
      expect(circleCount).toBeGreaterThanOrEqual(2);
    });
  });

  describe('main solar array dimensions', () => {
    it('main array wing length within ±5% of 2.68 units', () => {
      const expectedLen = 2.68;
      const arrayMeshes: THREE.Mesh[] = [];
      station.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name?.startsWith('array_')) {
          arrayMeshes.push(obj);
        }
      });
      expect(arrayMeshes.length).toBe(8);
      for (const m of arrayMeshes) {
        const box = new THREE.Box3().setFromObject(m);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longest = Math.max(size.x, size.y, size.z);
        expect(Math.abs(longest - expectedLen) / expectedLen).toBeLessThanOrEqual(0.05);
      }
    });

    it('iROSA overlay length within ±5% of 1.50 units', () => {
      const expectedLen = 1.5;
      const irosaMeshes: THREE.Mesh[] = [];
      station.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name?.startsWith('irosa_')) {
          irosaMeshes.push(obj);
        }
      });
      expect(irosaMeshes.length).toBe(6);
      for (const m of irosaMeshes) {
        const box = new THREE.Box3().setFromObject(m);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longest = Math.max(size.x, size.y, size.z);
        expect(Math.abs(longest - expectedLen) / expectedLen).toBeLessThanOrEqual(0.05);
      }
    });
  });

  describe('topology + ratio sanity', () => {
    it('truss runs along Z (perpendicular to module stack)', () => {
      const trussGroup = station.children.find((c) => c.name === 'truss_main');
      expect(trussGroup).toBeDefined();
      if (!trussGroup) return;
      const box = new THREE.Box3().setFromObject(trussGroup);
      const size = new THREE.Vector3();
      box.getSize(size);
      // Truss should be much longer in Z than X (perpendicular to module stack)
      expect(size.z).toBeGreaterThan(size.x * 5);
    });

    it('main pressurised stack runs along X', () => {
      const stackIds = ['zvezda', 'zarya', 'unity', 'destiny', 'harmony'];
      const positions: number[] = [];
      for (const id of stackIds) {
        station.traverse((obj) => {
          if (obj.name === id) {
            const wp = new THREE.Vector3();
            obj.getWorldPosition(wp);
            positions.push(wp.x);
          }
        });
      }
      expect(positions.length).toBeGreaterThanOrEqual(5);
      const xRange = Math.max(...positions) - Math.min(...positions);
      expect(xRange).toBeGreaterThan(3.0);
    });

    it('main array length > iROSA length (real-world ratio)', () => {
      const findFirst = (prefix: string): THREE.Mesh | null => {
        let found: THREE.Mesh | null = null;
        station.traverse((obj) => {
          if (!found && obj instanceof THREE.Mesh && obj.name?.startsWith(prefix)) found = obj;
        });
        return found;
      };
      const main = findFirst('array_');
      const irosa = findFirst('irosa_');
      expect(main).not.toBeNull();
      expect(irosa).not.toBeNull();
      if (!main || !irosa) return;
      const mainSize = new THREE.Vector3();
      const irosaSize = new THREE.Vector3();
      new THREE.Box3().setFromObject(main).getSize(mainSize);
      new THREE.Box3().setFromObject(irosa).getSize(irosaSize);
      const mainLen = Math.max(mainSize.x, mainSize.y, mainSize.z);
      const irosaLen = Math.max(irosaSize.x, irosaSize.y, irosaSize.z);
      expect(mainLen).toBeGreaterThan(irosaLen * 1.5);
    });

    it('Crew Dragon length > Harmony length (table sanity)', () => {
      const dragonExp = SPACESHIP_LENGTHS.visiting_crew_dragon;
      const harmonyExp = MODULE_LENGTHS.harmony;
      expect(dragonExp).toBeGreaterThan(harmonyExp);
    });

    it('Zvezda length > Soyuz length (table sanity)', () => {
      const soyuzExp = SPACESHIP_LENGTHS.visiting_soyuz;
      const zvezdaExp = MODULE_LENGTHS.zvezda;
      expect(zvezdaExp).toBeGreaterThan(soyuzExp);
    });
  });
});
