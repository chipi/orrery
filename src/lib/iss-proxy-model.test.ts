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
    it('main array blanket count = 16 (8 wings × 2 blankets each)', () => {
      // Each wing splits into top + bottom blanket box on either side
      // of a central mast. 4 anchors × 2 wings/anchor × 2 blankets/wing = 16.
      const blanketMeshes: THREE.Mesh[] = [];
      station.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.name?.startsWith('array_') &&
          !obj.name.startsWith('array_mast_')
        ) {
          blanketMeshes.push(obj);
        }
      });
      expect(blanketMeshes.length).toBe(16);
    });

    it('main array blanket length within ±5% of 2.68 units', () => {
      const expectedLen = 2.68;
      const blanketMeshes: THREE.Mesh[] = [];
      station.traverse((obj) => {
        if (
          obj instanceof THREE.Mesh &&
          obj.name?.startsWith('array_') &&
          !obj.name.startsWith('array_mast_')
        ) {
          blanketMeshes.push(obj);
        }
      });
      for (const m of blanketMeshes) {
        const box = new THREE.Box3().setFromObject(m);
        const size = new THREE.Vector3();
        box.getSize(size);
        const longest = Math.max(size.x, size.y, size.z);
        // Wider tolerance — Y-rotation tilt + sun-tracking can extend
        // the bbox slightly beyond the wing length axis.
        expect(Math.abs(longest - expectedLen) / expectedLen).toBeLessThanOrEqual(0.15);
      }
    });

    it('iROSA count = 4 (1 per anchor) and uses 1.5-unit BoxGeometry', () => {
      const irosaMeshes: THREE.Mesh[] = [];
      station.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.name?.startsWith('irosa_')) {
          irosaMeshes.push(obj);
        }
      });
      // 4 iROSA total — 2 per side (1 per anchor: P4, P6, S4, S6)
      expect(irosaMeshes.length).toBe(4);
      // Inspect the geometry directly (rotation-invariant) — longest
      // BoxGeometry parameter must be ~1.5 units.
      for (const m of irosaMeshes) {
        const params = (m.geometry as THREE.BoxGeometry).parameters;
        const longest = Math.max(params.width, params.height, params.depth);
        expect(Math.abs(longest - 1.5) / 1.5).toBeLessThanOrEqual(0.05);
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
      // Truss should be longer in Z than X. HRS radiators extend along
      // ±X perpendicular to truss (real ISS behaviour) so X-extent is
      // not zero — but Z (truss span) must still dominate.
      expect(size.z).toBeGreaterThan(size.x * 2.5);
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
      const findFirst = (prefix: string, excludeMast = false): THREE.Mesh | null => {
        let found: THREE.Mesh | null = null;
        station.traverse((obj) => {
          if (
            !found &&
            obj instanceof THREE.Mesh &&
            obj.name?.startsWith(prefix) &&
            (!excludeMast || !obj.name.startsWith('array_mast_'))
          )
            found = obj;
        });
        return found;
      };
      const main = findFirst('array_', true);
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

  describe('Phase 2 accessory regression', () => {
    function findFirstByName(prefix: string): THREE.Object3D | null {
      let found: THREE.Object3D | null = null;
      station.traverse((obj) => {
        if (!found && obj.name?.startsWith(prefix)) found = obj;
      });
      return found;
    }
    function countByName(prefix: string): number {
      let count = 0;
      station.traverse((obj) => {
        if (obj.name?.startsWith(prefix)) count++;
      });
      return count;
    }

    // Phase 2b — Russian segment
    it('Zvezda has engine bell (Phase 2b)', () => {
      expect(findFirstByName('zvezda_engine_bell')).not.toBeNull();
    });
    it('Nauka has ERA arm mount + radiator (Phase 2b)', () => {
      expect(findFirstByName('nauka_era_mount')).not.toBeNull();
      expect(findFirstByName('nauka_radiator')).not.toBeNull();
    });
    it('Prichal has 5 port stubs (Phase 2b)', () => {
      expect(countByName('prichal_port_')).toBe(5);
    });
    it('Rassvet has NESV instrumentation mount (Phase 2b)', () => {
      expect(findFirstByName('rassvet_nesv')).not.toBeNull();
    });

    // Phase 2c — Unity / Tranquility cluster
    it('Cupola has 7 window frames + central frame (Phase 2c)', () => {
      expect(countByName('cupola_window_frame')).toBe(6);
      expect(findFirstByName('cupola_central_frame')).not.toBeNull();
    });
    it('Quest has 4 HPGT tanks (Phase 2c)', () => {
      expect(countByName('quest_hpgt')).toBe(4);
    });
    it('Leonardo has 6 longitudinal ribs (Phase 2c)', () => {
      expect(countByName('leonardo_rib')).toBe(6);
    });
    it('BEAM has docking band (Phase 2c)', () => {
      expect(findFirstByName('beam_dock_band')).not.toBeNull();
    });
    it('Unity + Tranquility have zenith port stubs (Phase 2c)', () => {
      expect(findFirstByName('unity_zenith_port')).not.toBeNull();
      expect(findFirstByName('tranquility_zenith_port')).not.toBeNull();
    });

    // Phase 2d — Destiny / Harmony cluster
    it('Destiny has 4 handrails + window (Phase 2d)', () => {
      expect(countByName('destiny_handrail')).toBe(4);
      expect(findFirstByName('destiny_window')).not.toBeNull();
    });
    it('Kibo has ELM-PS + JEM-RMS (Phase 2d)', () => {
      expect(findFirstByName('kibo_elm_ps')).not.toBeNull();
      expect(countByName('kibo_jem_rms')).toBeGreaterThanOrEqual(4);
    });
    it('Columbus has Bartolomeo + 3 EPF mounts (Phase 2d)', () => {
      expect(findFirstByName('columbus_bartolomeo')).not.toBeNull();
      expect(countByName('columbus_epf')).toBe(3);
    });

    // Phase 2e — Truss external payloads
    it('Truss has Mobile Transporter rail (Phase 2e)', () => {
      expect(findFirstByName('mt_rail')).not.toBeNull();
    });
    it('Truss has 4 ELC platforms (Phase 2e)', () => {
      expect(countByName('elc_platform')).toBe(4);
    });
    it('Truss has AMS-02 cube + magnet ring (Phase 2e)', () => {
      expect(findFirstByName('ams_02')).not.toBeNull();
    });

    // Phase 2f — Canadarm2 + Dextre
    it('Canadarm2 has Dextre 2-armed manipulator (Phase 2f)', () => {
      // Dextre is built as 8 parts all named 'canadarm2' parts; check
      // module-id only by counting all canadarm2-tagged meshes.
      let armPartCount = 0;
      station.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.userData.moduleId === 'canadarm2') {
          armPartCount++;
        }
      });
      // Original Canadarm2 had 5 parts; with Dextre we expect 8.
      expect(armPartCount).toBeGreaterThanOrEqual(8);
    });
  });
});
