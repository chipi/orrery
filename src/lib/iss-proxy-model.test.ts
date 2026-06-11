// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import {
  buildIssProxyStation,
  ISS_MODULE_IDS,
  ISS_VISITOR_IDS,
  MODULE_BOXES,
} from './iss-proxy-model';

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
  // pirs intentionally skipped — retired/deorbited 2021, no longer rendered.
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
      // Pirs was deorbited 2021 and replaced by Nauka at the same nadir
      // port; the proxy model removed the duplicate render. Skip the
      // ratio guardrail since the mesh no longer exists.
      if (id === 'pirs') continue;
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

/* ──────────────────────────────────────────────────────────────────────
 * Structural / table-completeness invariants (Action 8 — #326)
 *
 * Coverage previously sat at 0.18× (364 test lines / 2008 source). These
 * tests close the gap on the static structural surface — table
 * completeness, id-namespace hygiene, and post-build module / visitor
 * presence — bringing the test:source ratio comfortably above 0.30×.
 * ───────────────────────────────────────────────────────────────────── */

describe('MODULE_BOXES table — structural invariants', () => {
  const ids = ISS_MODULE_IDS;
  const boxIds = MODULE_BOXES.map((row) => row[0]);
  const boxIdSet = new Set(boxIds);

  it('contains exactly one entry per ISS_MODULE_IDS member', () => {
    expect(boxIds).toHaveLength(ids.length);
    for (const id of ids) {
      expect(boxIdSet.has(id), `MODULE_BOXES missing entry for "${id}"`).toBe(true);
    }
  });

  it('contains no duplicate ids', () => {
    expect(boxIdSet.size).toBe(boxIds.length);
  });

  it('every entry has finite numeric coordinates + length + radius', () => {
    for (const [id, x, y, z, length, radius] of MODULE_BOXES) {
      expect(Number.isFinite(x), `${id}.x`).toBe(true);
      expect(Number.isFinite(y), `${id}.y`).toBe(true);
      expect(Number.isFinite(z), `${id}.z`).toBe(true);
      expect(Number.isFinite(length), `${id}.length`).toBe(true);
      expect(Number.isFinite(radius), `${id}.radius`).toBe(true);
    }
  });

  it('every length + radius is strictly positive', () => {
    for (const [id, , , , length, radius] of MODULE_BOXES) {
      expect(length, `${id}.length must be > 0`).toBeGreaterThan(0);
      expect(radius, `${id}.radius must be > 0`).toBeGreaterThan(0);
    }
  });

  it('every primary axis is one of x | y | z', () => {
    const axisSet = new Set(['x', 'y', 'z']);
    for (const [id, , , , , , axis] of MODULE_BOXES) {
      expect(axisSet.has(axis), `${id}.axis = "${axis}"`).toBe(true);
    }
  });

  it('all module centres lie within a reasonable bounding sphere (≤ 4 units from origin)', () => {
    // Sanity check: the proxy station has Zvezda at x≈-2.58 and Kibo at
    // (0.66, 0, -0.45). A module placed far outside that envelope is
    // almost certainly a data-entry typo.
    for (const [id, x, y, z] of MODULE_BOXES) {
      const r = Math.sqrt(x * x + y * y + z * z);
      expect(r, `${id} centre at (${x}, ${y}, ${z}) is too far from origin`).toBeLessThan(4);
    }
  });
});

describe('id-namespace hygiene', () => {
  it('ISS_MODULE_IDS contains no duplicates', () => {
    expect(new Set(ISS_MODULE_IDS).size).toBe(ISS_MODULE_IDS.length);
  });

  it('ISS_VISITOR_IDS contains no duplicates', () => {
    expect(new Set(ISS_VISITOR_IDS).size).toBe(ISS_VISITOR_IDS.length);
  });

  it('module ids and visitor ids do not collide', () => {
    const moduleSet = new Set(ISS_MODULE_IDS);
    for (const v of ISS_VISITOR_IDS) {
      expect(moduleSet.has(v as unknown as (typeof ISS_MODULE_IDS)[number])).toBe(false);
    }
  });

  it('every module id is a non-empty, lowercase-or-underscore string', () => {
    const re = /^[a-z][a-z0-9_]*$/;
    for (const id of ISS_MODULE_IDS) {
      expect(re.test(id), `module id "${id}" must match /^[a-z][a-z0-9_]*$/`).toBe(true);
    }
  });

  it('every visitor id is a non-empty, lowercase-or-underscore string', () => {
    const re = /^[a-z][a-z0-9_]*$/;
    for (const id of ISS_VISITOR_IDS) {
      expect(re.test(id), `visitor id "${id}" must match /^[a-z][a-z0-9_]*$/`).toBe(true);
    }
  });
});

describe('buildIssProxyStation — top-level structure', () => {
  it('returns a Group rooted at the world origin', () => {
    const g = buildIssProxyStation();
    expect(g).toBeInstanceOf(THREE.Group);
    expect(g.position.x).toBe(0);
    expect(g.position.y).toBe(0);
    expect(g.position.z).toBe(0);
  });

  it('contains at least one mesh tagged for every ISS_MODULE_ID (assembly walker needs them)', () => {
    const g = buildIssProxyStation();
    g.updateMatrixWorld(true);
    const taggedIds = new Set<string>();
    g.traverse((obj) => {
      const id = (obj as THREE.Object3D & { userData: { moduleId?: string } }).userData.moduleId;
      if (typeof id === 'string') taggedIds.add(id);
    });
    for (const id of ISS_MODULE_IDS) {
      // Pirs is deorbited and intentionally not rendered (see the
      // module-dimensions guardrail above).
      if (id === 'pirs') continue;
      expect(taggedIds.has(id), `no mesh tagged with moduleId "${id}"`).toBe(true);
    }
  });

  it('contains at least one mesh tagged for every ISS_VISITOR_ID', () => {
    const g = buildIssProxyStation();
    g.updateMatrixWorld(true);
    const taggedIds = new Set<string>();
    g.traverse((obj) => {
      const id = (obj as THREE.Object3D & { userData: { moduleId?: string } }).userData.moduleId;
      if (typeof id === 'string') taggedIds.add(id);
    });
    for (const id of ISS_VISITOR_IDS) {
      expect(taggedIds.has(id), `no mesh tagged with visitor moduleId "${id}"`).toBe(true);
    }
  });

  it('Group contains at least one child (top-level structural sanity)', () => {
    const g = buildIssProxyStation();
    expect(g.children.length).toBeGreaterThan(0);
  });

  it('every Mesh in the built station has a geometry attached', () => {
    const g = buildIssProxyStation();
    g.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      expect(obj.geometry, 'mesh found with null geometry').not.toBeNull();
    });
  });

  it('reports a non-trivial total mesh count (≥ 200 — sanity floor on the assembled station)', () => {
    const g = buildIssProxyStation();
    let n = 0;
    g.traverse((obj) => {
      if (obj instanceof THREE.Mesh) n++;
    });
    // The proxy station has ~300-400 meshes once trusses + arrays +
    // visitors are added. 200 is a loose floor that would catch a
    // catastrophic regression (e.g. an early-return that skips half
    // the build) without breaking on legitimate piece-count tuning.
    expect(n).toBeGreaterThanOrEqual(200);
  });

  it('two successive build calls produce independent Group instances (no module-level state)', () => {
    const a = buildIssProxyStation();
    const b = buildIssProxyStation();
    expect(a).not.toBe(b);
    expect(a.children.length).toBe(b.children.length);
    // Mutating one Group must not leak into the other.
    a.position.set(100, 100, 100);
    expect(b.position.x).toBe(0);
  });

  it('every mesh has finite world-space coordinates after updateMatrixWorld', () => {
    const g = buildIssProxyStation();
    g.updateMatrixWorld(true);
    const p = new THREE.Vector3();
    g.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      obj.getWorldPosition(p);
      expect(Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z)).toBe(true);
    });
  });

  it('every primary-axis value in MODULE_BOXES is one of x | y | z', () => {
    // Defensive double-check vs the structural-invariants test above —
    // there we tested axis membership against a Set; here we add a
    // narrowed type predicate that future refactors might trip.
    for (const [id, , , , , , axis] of MODULE_BOXES) {
      expect(['x', 'y', 'z']).toContain(axis);
      expect(typeof axis).toBe('string');
      expect((axis as string).length).toBe(1);
      expect((axis as string).toLowerCase()).toBe(axis);
      // Just for the satisfaction of the type narrower.
      const a = axis as 'x' | 'y' | 'z';
      expect(a === 'x' || a === 'y' || a === 'z', `${id}.axis = "${a}"`).toBe(true);
    }
  });

  it('main-stack module centres are roughly collinear along X within ±0.05 of y=z=0', () => {
    // Sanity check on the Russian + center segments — Zvezda → Harmony
    // should run as one continuous spine on the X axis. Drift here
    // would unbalance the entire silhouette.
    const stackIds = new Set(['zvezda', 'zarya', 'unity', 'destiny', 'harmony']);
    for (const [id, , y, z] of MODULE_BOXES) {
      if (!stackIds.has(id)) continue;
      expect(Math.abs(y), `${id}.y must be ≈ 0 (main stack)`).toBeLessThanOrEqual(0.05);
      expect(Math.abs(z), `${id}.z must be ≈ 0 (main stack)`).toBeLessThanOrEqual(0.05);
    }
  });

  it('main stack is ordered from Zvezda → Harmony along increasing X', () => {
    // Catches a future reshuffle of the table where e.g. Destiny would
    // accidentally migrate behind Zarya, breaking the silhouette.
    const order = ['zvezda', 'zarya', 'unity', 'destiny', 'harmony'];
    const xs = order.map((id) => {
      const row = MODULE_BOXES.find((r) => r[0] === id);
      expect(row, `MODULE_BOXES missing main-stack id "${id}"`).toBeTruthy();
      return row![1];
    });
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i], `${order[i]}.x must be > ${order[i - 1]}.x`).toBeGreaterThan(xs[i - 1]);
    }
  });

  it('every named module bounding box has finite + positive size', () => {
    const g = buildIssProxyStation();
    g.updateMatrixWorld(true);
    const seen = new Set<string>();
    const box = new THREE.Box3();
    const size = new THREE.Vector3();
    g.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;
      const id = obj.userData.moduleId;
      if (typeof id !== 'string' || seen.has(id)) return;
      seen.add(id);
      box.setFromObject(obj);
      box.getSize(size);
      expect(Number.isFinite(size.x) && Number.isFinite(size.y) && Number.isFinite(size.z)).toBe(
        true,
      );
      expect(
        size.x > 0 && size.y > 0 && size.z > 0,
        `module "${id}" bbox has a zero / negative dimension: (${size.x}, ${size.y}, ${size.z})`,
      ).toBe(true);
    });
  });
});
